---
title: "関数に名前付きで引数を渡したい"
emoji: "💂"
type: "tech"
topics:
  - "JavaScript"
  - "TypeScript"
  - "引数"
  - "オブジェクト"
  - "分割代入"
published: false
---

## はじめに

JavaScriptってなんで名前付きで引数を渡せないんだ？と思ったことありませんか？

例えば、このコードであればどうでしょうか。

```typescript
function repeatText(text, count) {
  return text.repeat(count)
}
console.log(repeatText("ボ", 7))  // => ボボボボボボボ
console.log(repeatText(7, "ボ"))  // => Uncaught TypeError: text.repeat is not a function
```

関数は別のファイルなどで定義されており、関数呼び出ししている箇所だけが見えている状態という前提です。このコードであれば、「ボ」というテキストが7回繰り返しされるんだろうなというのは、関数名や引数を見ればなんとなく想像できます。
引数を渡す順番も重要になります。前後入れ替えてしまうと、repeatメソッドは使えないよとエラーを投げられてしまいます。

一方、以下のようなコードであればどうでしょうか。

```typescript
function repeatText(beginingText, text, pattern, joiner, endingText) {
  const result = pattern.map(n => text.repeat(n)).join(joiner);
  return beginingText + result + endingText;
}
console.log(
  repeatText("「", "ボ", 7, [3, 2, 2], "ー", "爆誕」")
)  // => 「ボボボーボボーボボ爆誕」
```

関数呼び出しの部分だけを見て、まさか「ボボボーボボーボボ爆誕」という文字列がコンソールに出力するなんて思う人はいませんよね。勘の良い人を除いて。

この記事ではこのコードを修正することで、引数をどの順番で渡しても問題なく、関数呼び出しの部分だけを見て、「ボボボーボボーボボ爆誕」と表示されることを理解できるような状態にしていきます。

まとめると、この記事で行えるようにしたいことは

- 引数を渡す順番を気にしなくてもいいようにしたい
- 関数呼び出し部分だけを見て、

## オブジェクトを渡してみる

ここから先はボボボーボボーボボを使って説明を進めていきます。

```typescript
type repeatTextProps = {
  beginingText: string,
  text: string,
  pattern: number[],
  joiner: string,
  endingText: string,
}

function repeatText(props: repeatTextProps) {
  const result = props.pattern.map(n => props.text.repeat(n)).join(props.joiner);
  return props.beginingText + result + props.endingText;
}
console.log(
  repeatText({
    beginingText: "「",
    text: "ボ",
    pattern: [3, 2, 2],
    joiner: "ー",
    endingText: "爆誕」"
  })
)
```

なんなら、引数を渡す順序を分かりやすく変えてしまってもいいかもしれませんね。

```typescript
type repeatTextProps = {
  // 省略
}

function repeatText(props: repeatTextProps) {
  const result = props.pattern.map(n => props.text.repeat(n)).join(props.joiner);
  return props.beginingText + result + props.endingText;
}
console.log(
  repeatText({
    text: "ボ",
    joiner: "ー",
    pattern: [3, 2, 2],
    beginingText: "「",
    endingText: "爆誕」"
  })
)
```

始めのコードと比べると、ボボボーボボーボボ臭がだいぶ強く感じられるようになったかと思います。大成功です。

VSCodeの画面のスクショ？？

## 分割代入で受け取ってみる

直前のコードを見て思った方もいらっしゃると思いますが、propsという接頭辞のような振る舞いをしている部分が邪魔ですよね。これは分割代入を使用することで回避することができます。

```typescript
type repeatTextProps = {
  // 省略
}

function repeatText({beginingText, text, pattern, joiner, endingText}: repeatTextProps) {
  const result = pattern.map(n => text.repeat(n)).join(joiner);
  return beginingText + result + endingText;
}
console.log(
  repeatText({
    text: "ボ",
    joiner: "ー",
    pattern: [3, 2, 2],
    beginingText: "「",
    endingText: "爆誕」"
  })
)
```

全体としてだいぶスッキリした気がします。
この記事ももう終盤ですけど、そろそろコード全体がボボボーボボーボボに見えてきましたよね。

## まとめ

ボボボーボボーボボを感じ取れるようになってください。
好きになったよね？？
https://www.toei-anim.co.jp/tv/bo-bobo/
https://x.com/bo_bobo_info
