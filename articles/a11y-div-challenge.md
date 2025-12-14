---
title: "キーボードだけで操作できるWEBアプリを作りたい"
emoji: "🫶"
type: "idea"
topics:
  - "アクセシビリティ"
  - "a11y"
  - "waiaria"
published: false
---

## 0. はじめに

## 1. 概要

## 2. 準備

### 2-1. 知識のインプット

https://gihyo.jp/book/2023/978-4-297-13366-5

### 2-2. プロジェクトの作成

Nextjs のデフォルト設定を使用して開発

https://nextjs.org/docs/app/getting-started/installation

react-hook-form を入れておく

https://zenn.dev/b13o/articles/about-react-hook-form

## 3. 汎用コンポーネントの作成

### 3-1. ボタン

まずは骨格を以下のように作成します。
やはり div タグだけで作成するので美しいですね。

:::details ダイアログのマークアップ

```js
const test = "";
```

:::

#### 支援技術にボタンであることを伝える

role
tabIndex={disabled ? -1 : 0}

#### キーボードからクリックできるようにする

keydown

#### disabled 状態の制御ができるようにする

disabled

#### 完成したボタンコンポーネント

GIF 入れたいな

:::details 最終的なボタンコンポーネント（スタイルなし）

:::

### 3-2. ダイアログ

まずは骨格を以下のように作成します。

:::details ダイアログのマークアップ

```js
const test = "";
```

:::

#### 支援技術にダイアログであることを伝える

role='dialog' aria-modal aria-labelledby={titleId}
const titleId = useId();
id={titleId} role='heading' aria-level={2}

#### ダイアログ開閉時にフォーカスを移動する

id={titleId} ref={titleRef} role='heading' aria-level={2} tabIndex={-1}
const triggerRef = useRef<Element | null>(null);
const titleRef = useRef<HTMLDivElement | null>(null);
useEffect(() => {
if (props.open) {
// ダイアログ開閉直前にフォーカスがあった要素を保存
const active = document.activeElement;
if (active instanceof HTMLElement) triggerRef.current = active;
// ダイアログのタイトルにフォーカスを移動
titleRef.current?.focus();
} else {
// ダイアログを閉じる際には、開く前にフォーカスがあった要素に戻す
triggerRef.current?.focus();
}
}, [props.open]);

#### フォーカストラップを実装する

const closeBtnRef = useRef<HTMLDivElement | null>(null);

<div
onFocus={() => {
  closeBtnRef.current?.focus();
}}
tabIndex={0}
></div>
<div
  onFocus={() => {
    titleRef.current?.focus();
  }}
  tabIndex={0}
></div>

#### キーボードからダイアログを閉じることができるようにする

onKeyDown={handleCloseKeyDown}
const handleCloseKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
// Enter キーまたはスペースキーでダイアログを閉じる
if (e.key === "Enter" || e.key === " ") {
e.preventDefault();
props.onClose();
}
};

Ecs キーでの制御も

#### 完成したダイアログコンポーネント

GIF 入れたいな

:::details 最終的なダイアログコンポーネント（スタイルなし）

:::

### 3-3. エラー

:::details ダイアログのマークアップ

```js
const test = "";
```

:::

#### 支援技術が適切にエラーを扱えるようにする

aria-live='polite'
aria-atomic
className={`${rest.className ?? ""} ${errorText ? "" : "hidden"}`}

#### 完成したエラーコンポーネント

GIF 入れたいな

:::details 最終的なボタンコンポーネント（スタイルなし）

:::

### 3-4. Input フォーム

:::details ※＊のマークアップ

```js
const test = "";
```

:::

#### エラーとフォームを紐づける

#### 完成した Input コンポーネント

GIF 入れたいな

:::details 最終的なボタンコンポーネント（スタイルなし）

:::

### 3-5. Select フォーム

:::details ダイアログのマークアップ

```js
const test = "";
```

:::

#### 手順

#### 完成した Select コンポーネント

GIF 入れたいな

:::details 最終的なボタンコンポーネント（スタイルなし）

:::

### 3-6. Checkbox フォーム

:::details ダイアログのマークアップ

```js
const test = "";
```

:::

#### 手順何か

#### 完成した Select コンポーネント

GIF 入れたいな

:::details 最終的なボタンコンポーネント（スタイルなし）

:::

これ以外に、
formもあるよ


## 支援技術

## まとめ
