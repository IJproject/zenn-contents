---
title: "React の Container/Presentational × Hooks を関数型アーキテクチャで再設計する"
emoji: "🛠️"
type: "tech"
topics:
  - "react"
  - "nextjs"
  - "architecture"
  - "typescript"
  - "test"
published: false
---

## はじめに

私はもともとContainer/Presentationalパターンに対して懐疑的でした。このパターンを広めたDan Abramov氏（React core team）自身も2019年に元記事へ補足を加え、「もうこの分け方は推奨しない。Hooksで同じことができる」と述べています。自分もその流れに沿って、ロジックの分離はHooksで十分だと考えていました。

https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0

とはいえ、現場でContainer/Presentationalパターンを採用しているコードに触れる機会があり、その良さを理解しようとネット上でいろいろ調べてみました。しかし、「責務が分離される」「テストがしやすくなる」といった抽象的なメリットは語られるものの、具体的に何がどう良くなるのかを納得できる形で説明している記事はなかなか見つかりませんでした。

本記事では、Container/Presentationalパターンを関数型アーキテクチャの視点から捉え直し、Hooksとの関係やテスト容易性の具体像を自分なりに整理していきます。

## 概要

本記事のアプローチは、Container/Presentationalパターンに関数型アーキテクチャのFunctional Core（関数型コア）とImperative Shell（命令型シェル）の考え方を組み合わせ、**副作用の境界**を設計の軸に据えるものです。単なる責務分離ではなく、「どこに何を書くべきか」がレイヤーの性質から決まる構造を目指します。

最終的には、以下の3層に整理されます。

| レイヤー | 役割 | 副作用 |
|---|---|---|
| 関数型コア | 純粋な変換ロジック | なし |
| Container（Imperative Shell） | 副作用の制御、データの受け渡し | あり |
| Presentational | UIの描画 | なし |

再設計によって完成したContainerコンポーネントのサンプルコードを載せておきます。

```tsx
const PAGE_SIZE = 20;

export const UserListContainer = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  // 関数型コア: 純粋関数の呼び出し（宣言的）
  const displayUsers = sortUsers(users, sortKey);
  const pagedUsers = displayUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(displayUsers.length / PAGE_SIZE);

  const sortOptions = [
    { key: "name", label: "名前順" },
    { key: "createdAt", label: "登録日順" },
  ] as const;

  const handleChangeSortKey = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortKey(e.target.value as SortKey);  // 型安全ではないですが、大目に見てください
    setPage(1);
  };

  return (
    <UserListPresentational
      users={pagedUsers}
      sortKey={sortKey}
      sortOptions={sortOptions}
      onChangeSortKey={handleChangeSortKey}
      page={page}
      totalPages={totalPages}
      onChangePage={setPage}
    />
  );
};
```

Containerを読めば「何をしているコンポーネントなのか」が一目でわかるようになり、「どうやっているか」は関数型コアに閉じるようになります。本記事で言う「宣言的」とは、関数名がWhat（何をするか）を表現し、How（どうやるか）が内部に隠蔽されている状態を指します。

この構造がなぜ有効なのか、Hooksとどう共存するのか、テスト容易性とは具体的に何を指すのかを、順を追って見ていきます。

## ロジックをHooksで分離する実装（よくある例）

Hooksでロジックを分離する一般的なアプローチを、ユーザー一覧ページを例に見てみます。なお、本記事のコード例ではシンプルさを優先し、`User`や`SortKey`などの型定義は省略しています。

```tsx
export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  const displayUsers = useMemo(() => {
    let result = [...users];
    result.sort((a, b) =>
      sortKey === "name"
        ? a.name.localeCompare(b.name)
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return result;
  }, [users, sortKey]);

  const handleChangeSortKey = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortKey(e.target.value as SortKey);
  };

  const sortOptions = [
    { key: "name", label: "名前順" },
    { key: "createdAt", label: "登録日順" },
  ] as const;

  return { users: displayUsers, sortKey, sortOptions, handleChangeSortKey };
};
```

```tsx
export const UserListPage = () => {
  const { users, sortKey, sortOptions, handleChangeSortKey } = useUsers();

  return (
    <div>
      <select value={sortKey} onChange={handleChangeSortKey}>
        {sortOptions.map((option) => (
          <option key={option.key} value={option.key}>{option.label}</option>
        ))}
      </select>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
};
```

このHooksを読んで「何を担っているか」を把握するには、**処理の手順を一つずつ追う**必要があります。これらはすべて**命令型**のコードです。「何をしたいか（What）」よりも「どうやるか（How）」が前面に出ています。

さらに、性質の異なるロジックが混在しています。

- **純粋な変換ロジック**: `displayUsers`の算出（入力が同じなら出力も同じ）
- **副作用を伴う処理**: `fetchUsers`

もしこのHooksを**宣言的**に書き直せたら——「何をしたいか」が一目でわかるコードになれば——見通しは大きく改善するはずです。

次章では、その境界を設計するためのアプローチとして、Container/Presentationalパターンを改めて見ていきます。

## Container/Presentationalパターン

ここからはContainer/Presentationalパターンを改めて整理した上で、関数型アーキテクチャの視点を加えていきます。

### Container/Presentationalパターンとは何か

Container/Presentationalパターンは、ロジックとUIの関心を分離するフロントエンドのデザインパターンです。詳細は以下の記事が参考になります。

https://zenn.dev/buyselltech/articles/9460c75b7cd8d1

https://zenn.dev/akfm/books/nextjs-basic-principle/viewer/part_2_container_presentational_pattern

簡単に整理すると、2つのレイヤーに分かれます。

- **Container Component**: データ取得や状態管理などのロジックを担う。UIのスタイルは持たず、Presentationalにデータを渡す役割に徹する
- **Presentational Component**: Propsで受け取ったデータの表示に専念する。原則として内部状態を持たず、Propsのみに依存する

メリットとしてよく挙げられるのは、責務の明確化、テストのしやすさ、Presentationalの再利用性などです。ただ、「テストがしやすい」の具体像については、後のセクションで改めて掘り下げます。

先ほどのユーザー一覧をこのパターンで書き直すと、次のようになります。

```tsx
// Container
export const UserListContainer = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  const displayUsers = useMemo(() => {
    let result = [...users];
    result.sort((a, b) =>
      sortKey === "name"
        ? a.name.localeCompare(b.name)
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return result;
  }, [users, sortKey]);
  const pagedUsers = displayUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(displayUsers.length / PAGE_SIZE);

  const sortOptions = [
    { key: "name", label: "名前順" },
    { key: "createdAt", label: "登録日順" },
  ] as const;

  const handleChangeSortKey = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortKey(e.target.value as SortKey);
    setPage(1);
  };

  return (
    <UserListPresentational
      users={pagedUsers}
      sortKey={sortKey}
      sortOptions={sortOptions}
      onChangeSortKey={handleChangeSortKey}
      page={page}
      totalPages={totalPages}
      onChangePage={setPage}
    />
  );
};
```

```tsx
// Presentational
interface UserListPresentationalProps {
  users: User[];
  sortKey: SortKey;
  sortOptions: readonly { key: string; label: string }[];
  onChangeSortKey: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  page: number;
  totalPages: number;
  onChangePage: (page: number) => void;
}

export const UserListPresentational = ({ users, sortKey, sortOptions, onChangeSortKey, page, totalPages, onChangePage }: UserListPresentationalProps) => (
  <div>
    <select value={sortKey} onChange={onChangeSortKey}>
      {sortOptions.map((option) => (
        <option key={option.key} value={option.key}>{option.label}</option>
      ))}
    </select>
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
    <Pagination page={page} totalPages={totalPages} onChangePage={onChangePage} />
  </div>
);
```

Hooks版と比べて、ロジックとUIが明確に分かれました。Containerがデータ取得や加工を担い、Presentationalはpropsだけに依存する純粋なコンポーネントになっています。

ただし、Container内部を見ると、`useMemo`の中にソートの命令的な処理がそのまま残っています。次のセクションでは、ここをさらに改善します。

### 関数型アーキテクチャの視点

ここで、Container/Presentationalパターンを別の角度から見てみます。Functional Core（関数型コア）とImperative Shell（命令型シェル）という考え方です。

https://zenn.dev/loglass/articles/7e40d2a253bfd3

これはGary Bernhardt氏が提唱したアーキテクチャで、システムを2つの層に分けます。

- **Functional Core（関数型コア）**: 副作用を持たない純粋な関数群。同じ入力に対して常に同じ出力を返す
- **Imperative Shell（命令型シェル）**: 副作用（API呼び出し、状態更新、画面遷移など）を扱う外殻。関数型コアを呼び出し、その結果をもとに副作用を実行する

Reactは「UIは状態の関数である（UI = f(state)）」という関数型の思想で設計されています。Container/Presentationalパターンをこの視点で捉え直すと、次のように整理できます。

- **Container = Imperative Shell**: 副作用を扱い、関数型コアの結果をPresentationalに渡す
- **Presentational = 純粋なUI関数**: propsを受け取り、UIを返すだけ
- **関数型コア = Containerから切り出した純粋関数**: 副作用を持たないロジック

先ほどのContainerを見返してみましょう。`displayUsers`の算出ロジックは、入力（`users`と`sortKey`）が同じなら常に同じ結果を返す、純粋な変換処理です。これを関数型コアとして切り出します。

```tsx
// 関数型コア: 純粋な変換ロジック
const sortUsers = (users: User[], sortKey: SortKey): User[] => {
  return [...users].sort((a, b) =>
    sortKey === "name"
      ? a.name.localeCompare(b.name)
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
};
```

```tsx
// Container（Imperative Shell）
export const UserListContainer = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  const displayUsers = sortUsers(users, sortKey);
  const pagedUsers = displayUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(displayUsers.length / PAGE_SIZE);

  const sortOptions = [
    { key: "name", label: "名前順" },
    { key: "createdAt", label: "登録日順" },
  ] as const;

  const handleChangeSortKey = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortKey(e.target.value as SortKey);
    setPage(1);
  };

  return (
    <UserListPresentational
      users={pagedUsers}
      sortKey={sortKey}
      sortOptions={sortOptions}
      onChangeSortKey={handleChangeSortKey}
      page={page}
      totalPages={totalPages}
      onChangePage={setPage}
    />
  );
};
```

Containerの見通しが良くなりました。`useMemo`の中に埋まっていた命令的なソート処理が、`sortUsers`という**宣言的な呼び出し**に変わっています。Containerを読めば「何をしているか（What）」が一目でわかり、「どうやっているか（How）」は関数型コアに隠蔽されています。なお、ここでは簡略化のため`useMemo`を省略していますが、パフォーマンスが気になる場合は`useMemo(() => sortUsers(users, sortKey), [users, sortKey])`のようにメモ化できます。

この構造により、3つのレイヤーが明確になります。

| レイヤー | 役割 | 副作用 |
|---|---|---|
| 関数型コア（`sortUsers`） | 純粋な変換ロジック | なし |
| Container（Imperative Shell） | 副作用の制御、データの受け渡し | あり |
| Presentational | UIの描画 | なし |

#### コロケーションでのファイル分離

ここまでのコード例では、関数型コアをContainerと同じ文脈で示してきましたが、実際のプロジェクトでは**ファイルとして分離**する必要があります。関数型コアが独立したファイルになっていなければ、単体テストのインポート対象がなく、テストが書けません。

コロケーションの考え方に沿って、機能単位でファイルをまとめると次のようになります。

```
features/
  users/
    UserListContainer.tsx    # Container（Imperative Shell）
    UserListPresentational.tsx # Presentational
    sortUsers.ts             # 関数型コア
    sortUsers.test.ts        # 関数型コアのテスト
```

関数型コアが独立したファイルになることで、Reactに依存しない純粋な関数としてテストできるようになります。

コロケーションのメリットは単体テストだけではありません。特に大きいのは、**フォルダ構造がそのまま依存範囲を示す情報源になる**という点です。`users/`フォルダの中にあるファイルは、ユーザー一覧機能の中で閉じた依存関係を持つことが一目でわかります。新しいメンバーがコードを読むときも、影響範囲を把握するためにフォルダ構造を見るだけで済みます。

### Hooksとの共存

「Container/Presentationalパターンを採用するなら、Hooksは不要なのか？」というと、そうではありません。Hooksには、Containerの中でも活躍する場面があります。ここでは2つのユースケースを紹介します。**共通ロジックの分離**と**副作用のカプセル化**です。

#### 共通ロジックの分離

例えば、先ほどのContainerにあるソート周りのロジック（状態管理、関数型コアの呼び出し、選択肢の定義）は、他の一覧画面でも使い回したくなるかもしれません。

```tsx
const useSortUsers = (users: User[]) => {
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const sortedUsers = sortUsers(users, sortKey);

  const sortOptions = [
    { key: "name", label: "名前順" },
    { key: "createdAt", label: "登録日順" },
  ] as const;

  return { sortedUsers, sortKey, sortOptions, setSortKey };
};
```

```tsx
// useSortUsersを使ったContainer
export const UserListContainer = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  const { sortedUsers, sortKey, sortOptions, setSortKey } = useSortUsers(users);
  const pagedUsers = sortedUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(sortedUsers.length / PAGE_SIZE);

  const handleChangeSortKey = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortKey(e.target.value as SortKey);
    setPage(1);
  };

  return (
    <UserListPresentational
      users={pagedUsers}
      sortKey={sortKey}
      sortOptions={sortOptions}
      onChangeSortKey={handleChangeSortKey}
      page={page}
      totalPages={totalPages}
      onChangePage={setPage}
    />
  );
};
```

ここで注目したいのは、`useSortUsers`が担っているのは**Imperative Shell側のロジック**（状態管理や定数の定義）であり、純粋な変換ロジックは引き続き関数型コア（`sortUsers`）に閉じている点です。Hooksで切り出すのはあくまで「副作用や状態を伴う共通処理」であり、純粋なロジックは関数型コアに留めます。

なお、上記のコード例では`handleChangeSortKey`をContainer側に書いていますが、本来はHooks内で定義すべきです。Hooks内でイベントハンドラまで含めておけば、利用側のContainerはHooksの戻り値をそのままPresentationalに渡すだけで済みます。

#### 副作用のカプセル化

もう一つ、Hooksが有効に機能する場面があります。それは、**セットで実行しなければならない処理をまとめる**ケースです。

例えば、ユーザー情報の更新処理を考えてみましょう。

```tsx
// ユーザー情報を更新するだけでは不十分
await updateUser(userId, data);

// 一覧画面のキャッシュも再検証しなければ、
// 一覧に戻ったときに古い情報が表示され続ける
await mutate("/api/users");
```

このように、`updateUser()`と`mutate()`は必ずセットで実行する必要があります。しかし、これらがContainerにバラバラに書かれていると、別の開発者がユーザー編集機能を別の画面に実装するときに`mutate()`の存在に気づかず、一覧のキャッシュが古いままになる——といった不整合が起こり得ます。

```tsx
const useUpdateUser = () => {
  const { mutate } = useSWRConfig();

  const handleUpdateUser = async (userId: string, data: UpdateUserData) => {
    await updateUser(userId, data);
    await mutate("/api/users");
  };

  return { handleUpdateUser };
};
```

このようにHooksでまとめておけば、「ユーザーを更新する」という意図だけで正しい処理が実行されます。セットで実行すべき処理が隠蔽され、呼び出し側がキャッシュの再検証を意識する必要がなくなります。

### テスト容易性

Container/Presentationalパターンのメリットとして「テストがしやすい」とよく言われますが、正直なところ、最初はあまりピンときていませんでした。分けたところで、結局テストは書くわけで、何がどう楽になるのか。

しかし、関数型アーキテクチャの視点でレイヤーを整理してみると、各レイヤーごとに**テストの性質が明確に異なる**ことが見えてきます。

#### レイヤーごとのテスト方針

**関数型コア（`sortUsers`など）: 単体テスト**

純粋関数なので、入力と出力だけを検証すればよく、モックも不要です。テストが最も書きやすく、実行も高速で、最も信頼性の高いテストになります。

```ts
import { describe, expect, it } from "vitest";
import { sortUsers } from "./sortUsers";

const baseUsers: User[] = [
  { id: "1", name: "Andrew", createdAt: "2024-03-01" },
  { id: "2", name: "Bob", createdAt: "2024-01-15" },
  { id: "3", name: "Charlie", createdAt: "2024-02-10" },
];

/** @see {@link sortUsers} */
describe("sortUsers", () => {
  const TEST_CASES = [
    {
      title: "名前順でソートできる",
      args: { users: baseUsers, sortKey: "name" as const },
      expected: ["Andrew", "Bob", "Charlie"],
    },
    {
      title: "登録日順でソートできる",
      args: { users: baseUsers, sortKey: "createdAt" as const },
      expected: ["Bob", "Charlie", "Andrew"],
    },
    // ...
  ];

  it.each(TEST_CASES)("$title", ({ args, expected }) => {
    const result = sortUsers(args.users, args.sortKey);
    expect(result.map((u) => u.name)).toEqual(expected);
  });
});
```

上記の記法については、以下の記事をご覧ください。

https://zenn.dev/appleworld/articles/unit-test-arch-with-spec-driven

**Presentational: 単体テスト（Visual / Snapshot）**

propsだけに依存するため、任意のpropsを渡してUIの出力を検証できます。APIのモックやProviderのラップは不要です。

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserListPresentational } from "./UserListPresentational";

describe("UserListPresentational", () => {
  it("ユーザー一覧が表示される", () => {
    render(
      <UserListPresentational
        users={[{ id: "1", name: "Andrew", createdAt: "2024-01-15" }]}
        sortKey="name"
        sortOptions={[{ key: "name", label: "名前順" }]}
        onChangeSortKey={vi.fn()}
        page={1}
        totalPages={1}
        onChangePage={vi.fn()}
      />
    );
    expect(screen.getByText("Andrew")).toBeInTheDocument();
  });

  // ...
});
```

**Container: 結合テスト**

副作用を伴うため、APIのモックやProviderのセットアップが必要になります。テストのコストは最も高くなります。

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { UserListContainer } from "./UserListContainer";

vi.mock("./api", () => ({
  fetchUsers: vi.fn().mockResolvedValue([
    { id: "1", name: "Andrew", createdAt: "2024-01-15" },
  ]),
}));

describe("UserListContainer", () => {
  it("APIから取得したユーザーが表示される", async () => {
    render(<UserListContainer />);
    await waitFor(() => {
      expect(screen.getByText("Andrew")).toBeInTheDocument();
    });
  });

  // ...
});
```

#### Humble Objectパターン

Humble Objectは、Clean Architectureで紹介されているテスト設計の考え方で、テストしにくいコード（副作用、フレームワーク依存など）を**できるだけ薄く**保ち、テストしやすいコードにロジックを寄せるという思想です。

この設計では、ContainerがまさにHumble Objectです。純粋なロジックは関数型コアに、UIはPresentationalに切り出されているため、Container自体に残るのは「副作用の呼び出し」と「各レイヤーの接続」だけです。テストしにくいコードが薄ければ薄いほど、テストしにくい部分を無理にテストする必要性が下がります。

アーキテクチャの選択は、テスト戦略とセットで考えるべきものです。「どこにテストを厚くし、どこは薄くてよいか」を設計段階で判断できること——それがこのパターンにおける「テストがしやすい」の具体像だと考えています。

また、Clean Architectureにおける「アーキテクトは選択肢をなるべく残す」という原則にも通じます。関数型コアはフレームワークに依存しない純粋な関数なので、Reactに限らずどこからでも呼び出せます。テストフレームワークの制約も受けません。設計の選択肢を残すことが、結果としてテストの柔軟性にもつながっています。

#### ContainerとPresentationalでテスト範囲が被る問題

Container/Presentationalパターンを導入すると、「Containerの結合テストとPresentationalの単体テストで、テスト範囲が被るのでは？」という疑問が出てきます。

結論から言えば、被ること自体は問題ないと考えています。そもそも担保しているものが異なるからです。

- **Containerの結合テスト**: アプリケーションの機能が正しく動作するかを担保する。副作用を含めた一連の流れが期待通りに動くことを検証する
- **Presentationalの単体テスト**: コードの品質を担保する。propsに対してUIが正しく描画されることを検証する

テスト対象はあくまで**そのファイルの中のロジック**です。Containerはデータ取得や状態管理のロジックを、Presentationalは表示ロジックをテストします。責務がファイル単位で分かれている以上、テスト内容が実際に被ることは少ないはずです。

#### テストカバレッジとの向き合い方

Container/Presentationalパターンはテスト容易性が高いと述べてきましたが、そもそもそのテスト容易性は本当に必要でしょうか。

テストカバレッジを高くすることが容易になる——これは確かにメリットです。しかし、カバレッジを高く保つことには管理コストが伴います。テストコードの保守、実行時間、変更のたびに壊れるテストの修正。これらの負担と、リグレッション対策として得られる安心感のトレードオフを見極めた上で、アーキテクチャを選択する必要があります。

もしテストを薄く作る方針であれば——特にコードの品質を担保するための単体テストを手厚くする必要がないのであれば——Container/Presentationalパターンを採用するメリットは薄れます。その場合は、Hooksでロジックを分離するパターンで十分だと思います。

アーキテクチャは目的に対する手段であり、テスト戦略とセットで選択するものです。

### 応用パターン

ここまでで、概要で示したContainerが完成しました。ここからは、この構造をさらに発展させるパターンを紹介します。

#### ContainerからContainerを呼び出す

https://zenn.dev/globis/articles/c16eaadf3d233b

Containerの責務が大きくなった場合、親Containerから子Containerを呼び出すことで、ロジックをより小さいスコープに閉じ込められます。

```tsx
// ページレベルの親Container
export const UserPageContainer = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  if (users.length === 0) return null;

  return (
    <div>
      <UserPageTitlePresentational />
      <UserListContainer users={users} />
    </div>
  );
};
```

親Containerは子の組み合わせとレイアウトのみに責務を持ち、各子Containerがそれぞれのロジックを閉じ込めます。子コンポーネントにロジックが不要であれば、Presentationalのみで構いません。

| パターン | 使い分け |
|---------|---------|
| 子Container + Presentational | ロジック（状態管理、データ加工）がある場合 |
| Presentationalのみ | ロジックが不要な場合 |

#### Strategyパターン（高階関数の利用）

ContainerからContainerへの委譲は、さらにネストできます。`UserListContainer`の中でも、ソート機能を子Containerに切り出すことで、ソートに関するロジックを完全に閉じ込められます。

まず、前セクションの`sortUsers`では比較ロジックが関数内部にハードコードされていました。各ソートオプションに`compareFn`を持たせ、選択されたキーに応じて取り出す関数型コアを用意します。

```ts
// 関数型コア
type SortOption<T> = {
  key: string;
  label: string;
  compareFn: (a: T, b: T) => number;
};

const userSortOptions: SortOption<User>[] = [
  {
    key: "name",
    label: "名前順",
    compareFn: (a, b) => a.name.localeCompare(b.name),
  },
  {
    key: "createdAt",
    label: "登録日順",
    compareFn: (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  },
];

const userCompareFn = (sortKey: string) =>
  userSortOptions.find((o) => o.key === sortKey)!.compareFn;
```

この関数型コアを使い、ソート戦略の選択を担う子Containerを定義します。

```tsx
// 子Container: ソート戦略の選択と注入
const UserListSortContainer = ({
  onChangeCompareFn,
}: {
  onChangeCompareFn: (fn: (a: User, b: User) => number) => void;
}) => {
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const handleChangeSortKey = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSortKey = e.target.value as SortKey;
    setSortKey(newSortKey);
    onChangeCompareFn(userCompareFn(newSortKey));
  };

  return (
    <UserListSortPresentational
      sortKey={sortKey}
      sortOptions={userSortOptions}
      onChangeSortKey={handleChangeSortKey}
    />
  );
};
```

親Containerはソートの「実行」と「子Container間の協調」を担い、「何でソートするか」の判断は子Containerに委ねます。

```tsx
const PAGE_SIZE = 20;

// 親Container: ソートの実行、ページネーション、レイアウト
export const UserListContainer = ({ users }: { users: User[] }) => {
  const [compareFn, setCompareFn] = useState<(a: User, b: User) => number>(
    () => userCompareFn("name")
  );
  const [page, setPage] = useState(1);

  const sortedUsers = [...users].sort(compareFn);
  const pagedUsers = sortedUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(sortedUsers.length / PAGE_SIZE);

  // useStateに関数を保存する場合、() => fn でラップする必要がある
  const handleChangeCompareFn = (fn: (a: User, b: User) => number) => {
    setCompareFn(() => fn);
    setPage(1); // ソート変更時にページをリセット
  };

  return (
    <div>
      <UserListSortContainer onChangeCompareFn={handleChangeCompareFn} />
      <UserListPresentational users={pagedUsers} />
      <PaginationPresentational
        page={page}
        totalPages={totalPages}
        onChangePage={setPage}
      />
    </div>
  );
};
```

ここがこの設計のポイントです。`handleChangeCompareFn`は比較関数の更新だけでなく、ページのリセットも行っています。ソート変更時にページを1に戻す——この「子Container間の協調」は、親Containerだからこそ担える責務です。`UserListSortContainer`はページネーションの存在を知らず、`PaginationPresentational`はソートの存在を知りません。各子コンポーネントは自身の関心に閉じたまま、親Containerが全体を協調させています。

なお、`PaginationPresentational`は外部依存を含まないPresentationalコンポーネントです。propsで受け取った`page`と`totalPages`を表示し、`onChangePage`を呼び出すだけなので、Containerでラップする必要はありません。

Strategyパターンがコンポーネントの親子関係を通じて自然に実現されており、ソート条件を追加する場合も`userSortOptions`に選択肢を追加するだけで済みます。`SortOption<T>`はジェネリクスで定義されているため、ユーザー以外のエンティティにもそのまま再利用できます。

コロケーションと組み合わせると、フォルダ構造は次のようになります。

```
features/
  users/
    index.ts
    user-page-container.tsx
    user-page-title/
      index.ts                     # バレルエキスポート
      user-page-title-presentational.tsx
    user-list/
      index.ts
      user-list-container.tsx
      user-list-presentational.tsx
      user-list-sort/
        index.ts
        user-list-sort-container.tsx
        user-list-sort-presentational.tsx
        user-sort-options.ts        # 関数型コア
      user-list-pagination/
        index.ts
        user-list-pagination-container.tsx
        user-list-pagination-presentational.tsx
```

ここで重要なのは、**PresentationalからContainerを呼び出してはいけない**という点です。Presentationalは外部依存（APIフェッチ、LocalStorageなど）を含まないため、単体テストでモックが不要です。一方、Containerはいつでも外部依存を含む可能性があります。PresentationalがContainerを呼び出すと、その子Containerが持つ外部依存がPresentationalに漏れ込み、純粋性が失われます。結果として、Presentationalの単体テストにもモックやProviderのセットアップが必要になり、テスト容易性のメリットが崩れます。ロジックを含むコンポーネントの組み合わせは、常にContainer側で行います。

## おわりに

副作用の境界を設計の軸に据えることで、各レイヤーの役割とテスト方針が自然に決まる——これが本記事で示したかったことです。

また、応用パターンで示したように、親Containerが子Container間を協調させる構造は、機能が複雑化しても各Containerの関心を閉じたまま拡張できます。ソートとページネーションのように独立した関心事を、親Containerの一箇所で協調させることで、変更の影響範囲を局所化できます。

ただし、これが唯一の正解だとは思っていません。Container/Presentationalパターンは自分にとってのベストプラクティスではなく、あくまで選択肢の一つです。何を重要視するか（テスト容易性、変更容易性、開発スピードなど）によって、適切なアーキテクチャは変わります。Hooksでロジックを分離するパターンも、常に有力な選択肢です。

重要なのは、方針の転換に合わせやすい、柔軟なアーキテクチャを構築できるようにしておくことだと考えています。プロダクトの成長やチームの変化に応じて、テスト戦略もアーキテクチャも変わり得ます。そのときに身動きが取れなくならないよう、選択肢を残しておくこと。それがアーキテクトとしての力量が試されるところだと思います。