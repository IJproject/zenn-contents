---
title: "最終的に行き着いたReactのアーキテクチャ設計"
emoji: "📄"
type: "tech"
topics:
  - "typescript"
  - "react"
  - "nextjs"
  - "vitest"
  - "architecture"
published: false
---

## はじめに

## TL;DR

```ts:calc.ts
export const add = (a: number, b: number) => a + b
```

```ts:calc.test.ts
import { add } from "./calc"
/** @see {@link add} */
describe("add", () => {
  const TEST_CASES = [
    {
      title: "テストタイトル",
      args: [2, 3],
      expected: 5
    }
  ]

  it.each(TEST_CASES)("$title", ({args, expected}) => {
    expect(add(...args)).toEqual(expected)
  })
})

```

## 一般的な書き方

試しに、ChatGPT にサクッとテストコードを作成してみてもらいました。
大体こんなもんですよね。

```ts
// add.test.ts
import { describe, it, expect } from "vitest";
import { add } from "./add";

describe("add", () => {
  it("正の整数同士を足し算できる", () => {
    expect(add(2, 3)).toBe(5);
  });
  it("負の数を含む場合でも正しく計算できる", () => {
    expect(add(-1, 5)).toBe(4);
  });
  it("0を含む場合でも正しく計算できる", () => {
    expect(add(0, 7)).toBe(7);
  });
});
```
