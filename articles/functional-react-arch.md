---
title: "最終的に辿り着いたReactのアーキテクチャ設計"
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

- テスト容易性の高いContainer/Presentationalパターンを採用した
- 関数型アーキテクチャの思想を取り入れた
- 最大限のコロケーションを意識した
- テスト駆動開発を導入した
- Orvalを導入し、API準拠のクライアントを使用するようにした

## Container/Presentationalパターン

### Container/Presentationalパターンの概要

### 関数型アーキテクチャの概要

### フォルダ構成

### 依存関係

種別の依存関係

### コロケーション

### カスタムフックとの共存

### ロジックのスコープ極小化

高階関数パターン

## APIとの連携

### APIクライアントの自動生成

### 依存関係逆転

コンポーネント設計でも使用される概念
抽象化により、自動生成コードに対する依存度を下げる（APIに対しても）

## テスト駆動開発

単体テストは作成したモジュールが正しく動く・仕様漏れがないことを防ぐ
結合テストは、アプリケーションとしての機能に不備がないかをチェックする

### 単体テスト

ヘルパーとpresentational

### 結合テスト

### ContainerとPresentationalのテスト境界

### E2Eテスト

### テスト実行

## その他

### ライブラリのラップ