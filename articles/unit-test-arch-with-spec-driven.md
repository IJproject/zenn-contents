---
title: "仕様書として最大限機能させる単体テスト設計 - 仕様駆動開発（SDD）時代のテクニック"
emoji: "📄"
type: "tech"
topics:
  - "javascript"
  - "typescript"
  - "test"
  - "vitest"
  - "architecture"
published: false
---

## はじめに

普段、テストコードを書く際に意識していることはありますか？

これまでテストコードを書いたことがなかった私が、直近関わったプロジェクトにて単体テストの設計を行ったので、そこでの書き方を紹介します。

設計を決める上で重要視したのは、**人間が仕様を理解するのにかかる認知負荷を最小限にすること**です。昨今は
AIによるバイブコーディングが主流となる中で、コードを読む時間の割合が、以前よりも圧倒的に増えました。それに際して、読んで理解することにかかる負担を軽減するための設計を考えてみました。

## 完成コード

先に今回紹介する設計に沿ったテストコードのサンプルをお見せします。単純な足し算を行う関数の単体テストになっています。

```ts:calc.ts
interface AddParams {
  /** 被加数 */
  augend: number | string;
  /** 加数 */
  addend: number | string;
}
/** 2つの値を数値として加算 */
export const add = ({ augend, addend }: AddParams) => {
  const numericAugend = Number(augend);
  const numericAddend = Number(addend);

  if (Number.isNaN(numericAugend) || Number.isNaN(numericAddend)) return null;
  return numericAugend + numericAddend;
};
```

```ts:calc.test.ts
import { describe, expect, it } from "vitest";
import { add } from "./calc";

/** @see {@link add} */
describe("add", () => {
  const TEST_CASES = [
    {
      title: "正の整数同士を足し算できる",
      args: { augend: 2, addend: 3 },
      expected: 5,
    },
    {
      title: "負の数を含む場合でも正しく計算できる",
      args: { augend: -1, addend: 5 },
      expected: 4,
    },
                      :
                      :
                      :
    {
      title: "数値に変換できない文字列が含まれる場合はnullを返す",
      args: { augend: "abc", addend: 5 },
      expected: null,
    }
  ];

  it.each(TEST_CASES)("$title", ({ args, expected }) => {
    expect(add(args)).toBe(expected);
  });
});

```

## 一般的な書き方

私が認識しているものとして、単体テストは以下のような形式で記述するものが多いと感じております。

```ts
// add.test.ts
import { describe, it, expect } from "vitest";
import { add } from "./add";

describe("add", () => {
  it("正の整数同士を足し算できる", () => {
    expect(add({ augend: 2, addend: 3 })).toBe(5);
  });

  it("負の数を含む場合でも正しく計算できる", () => {
    expect(add({ augend: -1, addend: 5 })).toBe(4);
  });

  it("0を含む場合でも正しく計算できる", () => {
    expect(add({ augend: 0, addend: 7 })).toBe(7);
  });

  it("数値文字列を数値に変換して計算できる", () => {
    expect(add({ augend: "10", addend: "5" })).toBe(15);
  });

  it("片方だけ数値文字列でも計算できる", () => {
    expect(add({ augend: "10", addend: 5 })).toBe(15);
  });

  it("空白付き文字列を変換して計算できる", () => {
    expect(add({ augend: " 10 ", addend: "5" })).toBe(15);
  });

  it("空文字は0として扱われる", () => {
    expect(add({ augend: "", addend: 5 })).toBe(5);
  });

  it("小数を正しく計算できる", () => {
    expect(add({ augend: 1.5, addend: 2.5 })).toBe(4);
  });

  it("指数表記文字列を計算できる", () => {
    expect(add({ augend: "1e2", addend: 5 })).toBe(105);
  });

  it("数値に変換できない文字列が含まれる場合はnullを返す", () => {
    expect(add({ augend: "abc", addend: 5 })).toBeNull();
  });

  it("両方とも変換できない場合はnullを返す", () => {
    expect(add({ augend: "abc", addend: "def" })).toBeNull();
  });
});
```

ちなみにこちらは、ChatGPTに「add関数のテストコードを作成してください」という最小限のプロンプトで作成してもらったテストコードです。全体として見た印象ですが、見慣れた形式すぎて安心感がありますね。

## 仕様書として最大限に機能させる書き方

上記の一般的な書き方に対して、私は以下のように考えました。

- 入力値と出力値の対応をもっと見やすくできるのではない
- expect関数の実行をまとめて行数を減らすことができないか

その結果、冒頭でも紹介したようなテストコードに辿り着きました。
仕様把握に必要な、テストの意図（title）と入力値（args）、出力値（expected）の対応関係のみをテスト実行コードから分離しました。

```ts
import { describe, expect, it } from "vitest";
import { add } from "./calc";

/** @see {@link add} */
describe("add", () => {
  const TEST_CASES = [
    {
      title: "正の整数同士を足し算できる",
      args: { augend: 2, addend: 3 },
      expected: 5,
    },
    {
      title: "負の数を含む場合でも正しく計算できる",
      args: { augend: -1, addend: 5 },
      expected: 4,
    },
    {
      title: "0を含む場合でも正しく計算できる",
      args: { augend: 0, addend: 7 },
      expected: 7,
    },
    {
      title: "数値文字列を数値に変換して計算できる",
      args: { augend: "10", addend: "5" },
      expected: 15,
    },
    {
      title: "片方だけ数値文字列でも計算できる",
      args: { augend: "10", addend: 5 },
      expected: 15,
    },
    {
      title: "空白付き文字列を変換して計算できる",
      args: { augend: " 10 ", addend: "5" },
      expected: 15,
    },
    {
      title: "空文字は0として扱われる",
      args: { augend: "", addend: 5 },
      expected: 5,
    },
    {
      title: "小数を正しく計算できる",
      args: { augend: 1.5, addend: 2.5 },
      expected: 4,
    },
    {
      title: "指数表記文字列を計算できる",
      args: { augend: "1e2", addend: 5 },
      expected: 105,
    },
    {
      title: "数値に変換できない文字列が含まれる場合はnullを返す",
      args: { augend: "abc", addend: 5 },
      expected: null,
    },
    {
      title: "両方とも変換できない場合はnullを返す",
      args: { augend: "abc", addend: "def" },
      expected: null,
    },
  ];

  it.each(TEST_CASES)("$title", ({ args, expected }) => {
    expect(add(args)).toBe(expected);
  });
});
```

関数が持っている機能が分かりやすくなっているかと思います。

## おわりに

このAI時代に、人間視点での分かりやすさを追求することで、AIに作成してもらったコードの評価、AIに限らないPRのレビューなど、恩恵を多く得られていると思っています。

## 補足

### フロントエンド開発におけるテスト設計

フロントエンド開発ではコンポーネントのテストもあります。

### 結合テスト

今回は単体テストに絞っているため、結合テストの話はここまでしてきませんでした。実は、この記事で紹介している方法では、結合テストを書くことは難しい（逆に管理しにくくなりやすい）と考えています。