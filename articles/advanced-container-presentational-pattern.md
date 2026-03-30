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

自分が感じていた違和感などを述べる
- よく「テストがしやすい」と言われるが、それは具体的にどういうこと？
- Container/PresentationalはHooksに完全に置き換えられるってほんと？
- ロジックをなんでもかんでもHooksに落としていると、Hooksがでかくなりすぎてしまう、、その結果ロジックが非常に読みづらい（結論として、Containerとhooksに宣言的に、命令型を関数型コアに隠蔽することで全体像を見やすくする、単体テスト対象を分離する）

## 概要

全体像についてざっくり載せる（ここで読みたいと思わせたい）

責務分離ではなく、副作用の境界を設計している → どこに何を書くのかが明確になる

完成系のコードも載せる（containerぐらいでいいかな）

## ロジックをHooksで分離する実装（よくある例）

これ、かなり良いんですが…ベースで入る

## Container/Presentationalパターン

### Container/Presentationalパターンとは何か

https://zenn.dev/buyselltech/articles/9460c75b7cd8d1

https://zenn.dev/akfm/books/nextjs-basic-principle/viewer/part_2_container_presentational_pattern

記事の引用ベース＋少々のテキストで

### 関数型アーキテクチャの視点

https://zenn.dev/loglass/articles/7e40d2a253bfd3

記事の引用ベース＋少々のテキストで、コード例も
宣言型と命令型
よくReactは関数型で設計されているとか言われますね

### Hooksとの共存

Containerから共通ロジックの分離、ただし命令型シェルに限る。キャッシュの削除など暗黙のロジック隠蔽

### テスト容易性

具体的にどうテストがしやすいのか（使い始めは納得していなかったが、、、次第に、、、）

CleanArchitectureより
- HumbleObjectの思想、
- アーキテクトとして、選択肢をなるべく残す

テスト戦略の適用例を提示する（結合テストが一番厚い）

テストカバレッジがテストの品質を保証するのものではないので、そことの折り合いもみてアーキテクチャは選択する必要があることを添える

## おわりに