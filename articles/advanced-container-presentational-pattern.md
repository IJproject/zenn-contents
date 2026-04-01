---
title: "ReactのContainer/Presentationalを関数型アーキテクチャで再設計する（Hooksも元気してるよ）"
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

自分はもともとContainer/Presentationalパターンに対して懐疑的でした。Dan Abramov氏自身も2019年に記事へ補足を加え、Hooksによる分離を推奨しています。自分もその流れに沿って、ロジックの分離はHooksで十分だと考えていました。

とはいえ、現場でContainer/Presentationalパターンを採用しているコードに触れる機会があり、その良さを理解しようとネット上でいろいろ調べてみました。しかし、「責務が分離される」「テストがしやすくなる」といった抽象的なメリットは語られるものの、具体的に何がどう良くなるのかを納得できる形で説明している記事はなかなか見つかりませんでした。

そこで、自分なりに考えてみることにしました。出発点となったのは、次の2つの問いです。

**Container/Presentationalは、本当にHooksで完全に置き換えられるのか？**

Hooksはロジックの再利用において強力ですが、それはContainer/Presentationalパターンが担っていた「設計上の境界」まで代替できるということなのでしょうか。

**よく言われる「テストがしやすい」とは、具体的にどういうことなのか？**

Container/Presentationalパターンのメリットとしてよく挙げられる言葉ですが、どのレイヤーの何がテストしやすくなるのかが曖昧なまま語られることが多いように感じます。

本記事では、これらの問いに対する自分なりの答えを、関数型アーキテクチャの視点を交えながら整理していきます。

## 概要

全体像についてざっくり載せる（ここで読みたいと思わせたい）

責務分離ではなく、副作用の境界を設計している → どこに何を書くのかが明確になる

完成系のコードも載せる（containerぐらいでいいかな）

## ロジックをHooksで分離する実装（よくある例）

Hooksでロジックを分離する一般的なアプローチを、ユーザー一覧ページを例に見てみます。

```tsx
export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  useEffect(() => {
    fetchUsers({ sort: sortKey }).then(setUsers);
  }, [sortKey]);

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

  return { users: displayUsers, sortKey, handleChangeSortKey };
};
```

```tsx
const SORT_OPTIONS = [
  { key: "name", label: "名前順" },
  { key: "createdAt", label: "登録日順" },
] as const;

export const UserListPage = () => {
  const { users, sortKey, handleChangeSortKey } = useUsers();

  return (
    <div>
      <select value={sortKey} onChange={handleChangeSortKey}>
        {SORT_OPTIONS.map((option) => (
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

さて、ここからはContainer/Presentationalパターンを改めて整理した上で、先ほどの問いに立ち返ってみます。

### Container/Presentationalパターンとは何か

Container/Presentationalパターンは、ロジックとUIの関心を分離するフロントエンドのデザインパターンです。詳細は以下の記事が参考になります。

https://zenn.dev/buyselltech/articles/9460c75b7cd8d1

https://zenn.dev/akfm/books/nextjs-basic-principle/viewer/part_2_container_presentational_pattern

簡単に整理すると、2つのレイヤーに分かれます。

- **Container Component**: データ取得や状態管理などのロジックを担う。UIのスタイルは持たず、Presentationalにデータを渡す役割に徹する
- **Presentational Component**: Propsで受け取ったデータの表示に専念する。原則として内部状態を持たず、Propsのみに依存する

メリットとしてよく挙げられるのは、責務の明確化、テストのしやすさ、Presentationalの再利用性などです。ただ、前述の通り「テストがしやすい」の具体像については、後のセクションで改めて掘り下げます。

先ほどのユーザー一覧をこのパターンで書き直すと、次のようになります。

```tsx
// Container
export const UserListContainer = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");

  useEffect(() => {
    fetchUsers({ sort: sortKey }).then(setUsers);
  }, [sortKey]);

  const displayUsers = useMemo(() => {
    let result = [...users];
    result.sort((a, b) =>
      sortKey === "name"
        ? a.name.localeCompare(b.name)
        : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return result;
  }, [users, sortKey]);

  const sortOptions = [
    { key: "name", label: "名前順" },
    { key: "createdAt", label: "登録日順" },
  ] as const;

  return (
    <UserListPresentational
      users={displayUsers}
      sortKey={sortKey}
      sortOptions={sortOptions}
      onChangeSortKey={setSortKey}
    />
  );
};
```

```tsx
// Presentational
interface UserListPresentationalProps = {
  users: User[];
  sortKey: SortKey;
  sortOptions: readonly { key: string; label: string }[];
  onChangeSortKey: (key: SortKey) => void;
};

export const UserListPresentational = ({ users, sortKey, sortOptions, onChangeSortKey }: UserListPresentationalProps) => {
  const handleChangeSortKey = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeSortKey(e.target.value as SortKey);
  };

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

Hooks版と比べて、ロジックとUIが明確に分かれました。Containerがデータ取得や加工を担い、Presentationalはpropsだけに依存する純粋なコンポーネントになっています。

### 関数型アーキテクチャの視点

ここで、Container/Presentationalパターンを別の角度から見てみます。「Functional Core, Imperative Shell」という考え方です。

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

  useEffect(() => {
    fetchUsers({ sort: sortKey }).then(setUsers);
  }, [sortKey]);

  const displayUsers = sortUsers(users, sortKey);

  const sortOptions = [
    { key: "name", label: "名前順" },
    { key: "createdAt", label: "登録日順" },
  ] as const;

  return (
    <UserListPresentational
      users={displayUsers}
      sortKey={sortKey}
      sortOptions={sortOptions}
      onChangeSortKey={setSortKey}
    />
  );
};
```

Containerの見通しが良くなりました。`useMemo`の中に埋まっていた命令的なソート処理が、`sortUsers`という**宣言的な呼び出し**に変わっています。Containerを読めば「何をしているか（What）」が一目でわかり、「どうやっているか（How）」は関数型コアに隠蔽されています。

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

「Container/Presentationalパターンを採用するなら、Hooksは不要なのか？」というと、そうではありません。Hooksには、Containerの中でも活躍する場面があります。

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

ここで注目したいのは、`useSortUsers`が担っているのは**Imperative Shell側のロジック**（状態管理や定数の定義）であり、純粋な変換ロジックは引き続き関数型コア（`sortUsers`）に閉じている点です。Hooksで切り出すのはあくまで「副作用や状態を伴う共通処理」であり、純粋なロジックは関数型コアに留めます。

#### 暗黙のロジック隠蔽

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

**Presentational: 単体テスト（Visual / Snapshot）**

propsだけに依存するため、任意のpropsを渡してUIの出力を検証できます。APIのモックやProvider のラップは不要です。Storybookとの相性も良く、ビジュアルリグレッションテストの対象としても扱いやすくなります。

**Container: 結合テスト**

副作用を伴うため、APIのモックやProviderのセットアップが必要になります。テストのコストは最も高くなりますが、ここで注目したいのが**Humble Object**の考え方です。

#### Humble Objectパターン

Humble Objectは、Clean Architectureで紹介されているテスト設計の考え方で、テストしにくいコード（副作用、フレームワーク依存など）を**できるだけ薄く**保ち、テストしやすいコードにロジックを寄せるという思想です。

この設計では、Containerがまさに Humble Objectです。純粋なロジックは関数型コアに、UIはPresentationalに切り出されているため、Container自体に残るのは「副作用の呼び出し」と「各レイヤーの接続」だけです。テストしにくいコードが薄ければ薄いほど、テストしにくい部分を無理にテストする必要性が下がります。

アーキテクチャの選択は、テスト戦略とセットで考えるべきものです。「どこにテストを厚くし、どこは薄くてよいか」を設計段階で判断できること——それがこのパターンにおける「テストがしやすい」の具体像だと考えています。

また、Clean Architectureにおける「アーキテクトは選択肢をなるべく残す」という原則にも通じます。関数型コアはフレームワークに依存しない純粋な関数なので、Reactに限らずどこからでも呼び出せます。テストフレームワークの制約も受けません。設計の選択肢を残すことが、結果としてテストの柔軟性にもつながっています。

### その他

#### ContainerからContainerを呼び出す

https://zenn.dev/globis/articles/c16eaadf3d233b

Containerの責務が大きくなった場合、親Containerから子Containerを呼び出すことで、ロジックをより小さいスコープに閉じ込められます。

```tsx
export const UserPageContainer = () => {
  const users = fetchUsers();
  if (!users) return null;

  return (
    <div>
      <UserPageTitlePresentational />
      <UserListContainer users={users} />
      <UserSearchDialogContainer users={users} />
    </div>
  );
};
```

親Containerは子の組み合わせとレイアウトのみに責務を持ち、各子Containerがそれぞれのロジックを閉じ込めます。子コンポーネントにロジックが不要であれば、Presentationalのみで構いません。

| パターン | 使い分け |
|---------|---------|
| 子Container + Presentational | ロジック（状態管理、データ加工）がある場合 |
| Presentationalのみ | ロジックが不要な場合 |

先ほどのコロケーションと組み合わせると、フォルダ構造は次のようになります。

```
features/
  users/
    UserPageContainer.tsx
    UserPageTitlePresentational.tsx
    user-list/
      UserListContainer.tsx
      UserListPresentational.tsx
      sortUsers.ts
    user-search-dialog/
      UserSearchDialogContainer.tsx
      UserSearchDialogPresentational.tsx
```

ここで重要なのは、**PresentationalからContainerを呼び出してはいけない**という点です。Presentationalはpropsのみに依存する純粋なコンポーネントであるべきで、その中からContainerを呼び出すとHumble Objectの設計原則が崩れ、テストの選択肢も狭まります。ロジックを含むコンポーネントの組み合わせは、常にContainer側で行います。

#### デコレータパターン（高階関数）

前セクションの`sortUsers`では、比較ロジックが関数内部にハードコードされていました。高階関数を使うと、ソートの「実行」と「ロジック（compareFn）」を分離できます。

各ソートオプションに`compareFn`を持たせ、選択されたキーに応じて取り出す構成にします。

```tsx
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

```tsx
// Container
export const UserListContainer = ({ users }: { users: User[] }) => {
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const compareFn = userCompareFn(sortKey);
  const displayUsers = [...users].sort(compareFn);

  return (
    <UserListPresentational
      users={displayUsers}
      sortKey={sortKey}
      sortOptions={userSortOptions}
      onChangeSortKey={setSortKey}
    />
  );
};
```

Container内で`[...users].sort(compareFn)`と書けるようになり、「何でソートしているか」が一目でわかります。比較ロジックはsortOptionsの各`compareFn`に閉じているため、ソート条件を追加する場合もsortOptionsに選択肢を追加するだけで済みます。

`SortOption<T>`はジェネリクスで定義されているため、ユーザー以外のエンティティにもそのまま再利用できます。前セクションの親子Container構成と組み合わせると、親Container側でソートの実行を、子Container側でcompareFnの注入を担う——という責務の分離が自然に実現します。


#### ContainerコンポーネントとPresentationalコンポーネントでテスト範囲が被る問題

<!-- TODO: 必要に応じてテストのサンプルコードを追加 -->

Container/Presentationalパターンを導入すると、「Containerの結合テストとPresentationalの単体テストで、テスト範囲が被るのでは？」という疑問が出てきます。

結論から言えば、被ること自体は問題ありません。そもそも担保しているものが異なるからです。

- **Containerの結合テスト**: アプリケーションの機能が正しく動作するかを担保する。副作用を含めた一連の流れが期待通りに動くことを検証する
- **Presentationalの単体テスト**: コードの品質を担保する。propsに対してUIが正しく描画されることを検証する

テスト対象はあくまで**そのファイルの中のロジック**です。Containerはデータ取得や状態管理のロジックを、Presentationalは表示ロジックをテストします。責務がファイル単位で分かれている以上、テスト内容が実際に被ることは少ないはずです。

#### テストカバレッジとの向き合い方

Container/Presentationalパターンはテスト容易性が高いと述べてきましたが、そもそもそのテスト容易性は本当に必要でしょうか。

テストカバレッジを高くすることが容易になる——これは確かにメリットです。しかし、カバレッジを高く保つことには管理コストが伴います。テストコードの保守、実行時間、変更のたびに壊れるテストの修正。これらの負担と、リグレッション対策として得られる安心感のトレードオフを見極めた上で、アーキテクチャを選択する必要があります。

もしテストを薄く作る方針であれば——特にコードの品質を担保するための単体テストを手厚くする必要がないのであれば——Container/Presentationalパターンを採用するメリットは薄れます。その場合は、Hooksでロジックを分離するパターンで十分です。

アーキテクチャは目的に対する手段であり、テスト戦略とセットで選択するものです。

## おわりに

本記事では、Container/Presentationalパターンを関数型アーキテクチャの視点から再設計するアプローチを紹介しました。

ただし、これが唯一の正解だとは思っていません。Container/Presentationalパターンは自分にとってのベストプラクティスではなく、あくまで選択肢の一つです。何を重要視するか（テスト容易性、変更容易性、開発スピードなど）によって、適切なアーキテクチャは変わります。Hooksでロジックを分離するパターンも、常に有力な選択肢です。

重要なのは、方針の転換に合わせやすい、柔軟なアーキテクチャを構築できるようにしておくことだと考えています。プロダクトの成長やチームの変化に応じて、テスト戦略もアーキテクチャも変わり得ます。そのときに身動きが取れなくならないよう、選択肢を残しておくこと。それがアーキテクトとしての力量が試されるところだと思います。