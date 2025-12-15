---
title: "キーボードだけで操作できるWEBアプリを作りたい"
emoji: "🫶"
type: "idea"
topics:
  - "a11y"
  - "waiaria"
published: false
---

※この記事は [アップルワールド Advent Calendar 2025](https://qiita.com/advent-calendar/2025/appleworld) 20 日目の記事です。

## 1. 概要

この記事では、以下の制約を設けてログインフォームを作成していきます。

使用してもよい HTML タグは、以下の 2 種類のみとして進めます。

- form 系のタグ（input, select など）
- ネイティブセマンティクスを持たない div タグのみ

## 2. 準備

### 2-1. 知識のインプット

実装を始める前に、アクセシビリティとユーザビリティに関してのインプットを行いました。
アクセシビリティといえば WAI-ARIA ですが、これ以外にも AOM（アクセシビリティオブジェクトモデル）の存在など、今までに出会ったことのなかった事柄に触れることができ、腰を据えて読んだ甲斐があったなと感じる一冊でした。

https://gihyo.jp/book/2023/978-4-297-13366-5

### 2-2. プロジェクトの作成

最近色んな意味で話題の、Nextjs を使用して実装を行います。
設定はデフォルトのものを使用して進めていきます。（TypeScript, AppRouter, Tailwind, ESLint, etc.）

https://nextjs.org/docs/app/getting-started/installation

ログインフォームを作成するので、実装を単純にするために react-hook-form と zod を入れておきます。

https://zenn.dev/b13o/articles/about-react-hook-form

## 3. 汎用コンポーネントの作成

まずは汎用的に使えるコンポーネントを先に実装し、それらを活用してログインフォームを作成する方針で進めていきます。

### 3-1. ボタン

まず始めに Button コンポーネントから作成していきます。
最低限 Button として使用できる程度での実装を初期状態として、実装を進めていきます。

:::details Button コンポーネントの土台

```js
"use client";

import { forwardRef } from "react";

interface A11yButtonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> {
  onClick: () => void;
  children: React.ReactNode;
}

export const A11yButton = forwardRef<HTMLDivElement, A11yButtonProps>(
  ({ onClick, children, ...rest }, ref) => {

    return (
      <div
        {...rest}
        ref={ref}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }
);

A11yButton.displayName = "A11yButton";
```

:::

#### 支援技術にボタンであることを伝える

まずは、ただの div タグである以上、ブラウザにも支援技術にもボタンであることが伝わっていないので、WAI-ARIA の role 属性を付与することにします。

:::details role 属性を付与

```diff
"use client";

import { forwardRef } from "react";

interface A11yButtonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> {
  onClick: () => void;
  children: React.ReactNode;
}

export const A11yButton = forwardRef<HTMLDivElement, A11yButtonProps>(
  ({ onClick, children, ...rest }, ref) => {

    return (
      <div
        {...rest}
        ref={ref}
+       role='button'
        onClick={onClick}
      >
        {children}
      </div>
    );
  }
);

A11yButton.displayName = "A11yButton";
```

:::

#### キーボードからクリックできるようにする

次は、キーボードのみで操作できるように修正していきます。

実装する内容としては、以下の 3 つです。

- Tab キーでフォーカスを当てることができるようになる
- フォーカスが当たった状態で Enter キーを押下するとクリック判定になる
- フォーカスが当たった状態で Space キーを押下して離すとクリック判定になる

※ これらの機能は、button タグがデフォルトで持っている機能と全く同じです。

:::details キーボード操作を可能にする

```diff
"use client";

import { forwardRef } from "react";

interface A11yButtonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> {
  onClick: () => void;
  children: React.ReactNode;
}

export const A11yButton = forwardRef<HTMLDivElement, A11yButtonProps>(
  ({ onClick, children, ...rest }, ref) => {
+   const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
+     e.preventDefault();
+     onClick();
+   };

+   const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
+     if (e.key === "Enter") {
+       e.preventDefault();
+       onClick();
+     } else if (e.key === " ") {
+       // スペースキーの場合はKeyUpでクリックイベントを発火させるので、ここではデフォルトの動作を防ぐだけ
+       e.preventDefault();
+     }
+     rest.onKeyDown?.(e);
+   };

+   const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
+     if (e.key === " ") {
+       onClick();
+     }
+     rest.onKeyUp?.(e);
+   };

    return (
      <div
        {...rest}
        ref={ref}
        role='button'
+       onClick={handleClick}
+       onKeyUp={handleKeyUp}
+       onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    );
  }
);

A11yButton.displayName = "A11yButton";
```

:::

#### disabled 状態の制御ができるようにする

button タグには、ニーズが比較的高めな disabled 属性が存在するので、こちらも実装します。
内容はシンプルで、disabled プロパティを受け取ることができるように変更し、その内容をもとにクリックできるかどうかを制御するだけです。

:::details disabled 状態を設定できるようにする

```diff
"use client";

import { forwardRef } from "react";

interface A11yButtonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> {
  onClick: () => void;
+ disabled?: boolean;
  children: React.ReactNode;
}

export const A11yButton = forwardRef<HTMLDivElement, A11yButtonProps>(
- ({ onClick, children, ...rest }, ref) => {
+ ({ onClick, disabled = false, children, ...rest }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
+     if (disabled) return;
      e.preventDefault();
      onClick();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
+     if (disabled) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onClick();
      } else if (e.key === " ") {
        // スペースキーの場合はKeyUpでクリックイベントを発火させるので、ここではデフォルトの動作を防ぐだけ
        e.preventDefault();
      }
      rest.onKeyDown?.(e);
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
+     if (disabled) return;
      if (e.key === " ") {
        onClick();
      }
      rest.onKeyUp?.(e);
    };

    return (
      <div
        {...rest}
        ref={ref}
        role='button'
+       aria-disabled={disabled}
-       tabIndex={0}
+       tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    );
  }
);

A11yButton.displayName = "A11yButton";

```

:::

#### 完成したボタンコンポーネント

キーボードからの操作に加え、button タグがデフォルトで持っている機能のうちニーズが高いものを実装することができました。

ここに GIF 入れたいな

:::details 最終的な Button コンポーネント（スタイルなし）

```js
"use client";

import { forwardRef } from "react";

interface A11yButtonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export const A11yButton = forwardRef<HTMLDivElement, A11yButtonProps>(
  ({ onClick, disabled = false, children, ...rest }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      onClick();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onClick();
      } else if (e.key === " ") {
        // スペースキーの場合はKeyUpでクリックイベントを発火させるので、ここではデフォルトの動作を防ぐだけ
        e.preventDefault();
      }
      rest.onKeyDown?.(e);
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (e.key === " ") {
        onClick();
      }
      rest.onKeyUp?.(e);
    };

    return (
      <div
        {...rest}
        ref={ref}
        role='button'
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    );
  }
);

A11yButton.displayName = "A11yButton";

```

:::

### 3-2. ダイアログ

次は Dialog コンポーネントを作成します。
例に漏れず、土台だけ作成してあるので、そこから実装を進めていきます。

:::details ダイアログのマークアップ

見渡す限り一面の div タグは、やはり美しいですね。

```js
"use client";

import { A11yButton } from "./button";

interface A11yDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const A11yDialog = ({
  title,
  open,
  onClose,
  children,
}: A11yDialogProps) => {
  if (!open) {
    return null;
  }

  return (
    <div>
      {/* オーバーレイ */}
      <div onClick={onClose}></div>

      <div>
        <A11yButton onClick={onClose}>×</A11yButton>
        <div
          // ダイアログ初期表示時に、フォーカスインジケーターが表示されないようにするためのリセットCSSクラス
          className='outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0'
        >
          {title}
        </div>
        {children}
      </div>
    </div>
  );
};
```

:::

#### 支援技術にダイアログであることを伝える

まずは、ブラウザと支援技術に対してダイアログであることを伝えるために、WAI-ARIA を存分に活用します。
useId で一意のキーを作成していますが、こちらは `role='dialog'` が付与された `aria-labelledby` に紐づく要素の中身が、ダイアログを開いたタイミングでスクリーンリーダに読んでもらえる用にするための、アクセシビリティ上での対応です。
見出しには `<h*>` タグを使用したいところですが、div タグのみという制約があるので、最大限の努力をして `<h2>` に近づけます。

:::details ダイアログのマークアップ

```diff
"use client";

+ import { useId } from "react";
import { A11yButton } from "./button";

interface A11yDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const A11yDialog = ({
  title,
  open,
  onClose,
  children,
}: A11yDialogProps) => {
+ const titleId = useId();

  if (!open) {
    return null;
  }

  return (
    <div>
      {/* オーバーレイ */}
      <div onClick={onClose}></div>

-     <div>
+     <div role='dialog' aria-modal aria-labelledby={titleId}>
        <A11yButton
          onClick={onClose}
+         aria-label='ダイアログを閉じる' // しれっと
        >
          ×
        </A11yButton>
        <div
+         id={titleId}
+         role='heading'
+         aria-level={2}
          // ダイアログ初期表示時に、フォーカスインジケーターが表示されないようにするためのリセットCSSクラス
          className='outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0'
        >
          {title}
        </div>
        {children}
      </div>
    </div>
  );
};

```

:::

#### ダイアログ開閉時にフォーカスを移動する

次は、ダイアログを開いた際に、ダイアログ内の要素にフォーカスを移すように変更します。
現状だと、ダイアログを開いたとしても、ダイアログを開く際にクリックしたボタンにフォーカスが当たったままになってしまいます。

ダイアログを閉じた際にも、ダイアログ内にフォーカスからフォーカスを返さないといけないことを考えて、以下のようなフローを考えます。

1. ダイアログを開く直前、フォーカスが当たっていた要素の参照を保持する（コード上では `triggerRef`）
2. ダイアログが開いた直後、ダイアログの見出しにフォーカスを当てる（このタイミング以外では見出しにフォーカスを当てることができないようにする）
3. ダイアログを閉じる直前、`triggerRef` にフォーカスを移動させる

:::details ダイアログのマークアップ

```diff
"use client";

- import { useId } from "react";
+ import { useEffect, useId } from "react";
import { A11yButton } from "./button";

interface A11yDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const A11yDialog = ({
  title,
  open,
  onClose,
  children,
}: A11yDialogProps) => {
  const titleId = useId();

+ // フォーカス管理のためのRef
+ const triggerRef = useRef<HTMLElement | null>(null);
+ const titleRef = useRef<HTMLDivElement | null>(null);

+ useEffect(() => {
+   if (open) {
+     // 開く直前にフォーカスがあった要素を保存
+     const active = document.activeElement;
+     if (active instanceof HTMLElement) triggerRef.current = active;
+
+     // タイトルにフォーカス
+     titleRef.current?.focus();
+   } else {
+     triggerRef.current?.focus();
+   }
+ }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div>
      {/* オーバーレイ */}
      <div onClick={onClose}></div>

      <div role='dialog' aria-modal aria-labelledby={titleId}>
        <A11yButton
          onClick={onClose}
          aria-label='ダイアログを閉じる'
        >
          ×
        </A11yButton>
        <div
          id={titleId}
+         ref={titleRef}
          role='heading'
          aria-level={2}
          // ダイアログ初期表示時に、フォーカスインジケーターが表示されないようにするためのリセットCSSクラス
          className='outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0'
        >
          {title}
        </div>
        {children}
      </div>
    </div>
  );
};

```

:::

#### フォーカストラップを実装する

ここからはフォーカストラップというものを実装します。
現状の状態では、ダイアログを開いた際にダイアログの見出しにフォーカスを合わせることはできましたが、このフォーカスを Tab キーで移動し続けてみると、ダイアログ外に出てしまい、ダイアログ下の要素にフォーカスが当たってしまいます。
そこで、ダイアログコンポーネントの DOM の境界に、フォーカスの壁となるよう要素を作成することでこれを回避します。その壁のことをフォーカストラップと言います。
実装内容としては直感的で、そのフォーカストラップにフォーカスが当たると、ダイアログ要素の反対側に返すようにします。

:::details ダイアログのマークアップ

```diff
"use client";

import { useEffect, useId } from "react";
import { A11yButton } from "./button";

interface A11yDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

+ // フォーカス可能要素
+ const focusableSelector = [
+   "[tabindex]:not([tabindex='-1'])",
+   "input",
+   "select",
+   "textarea",
+ ].join(",");

export const A11yDialog = ({
  title,
  open,
  onClose,
  children,
}: A11yDialogProps) => {
  const titleId = useId();

  // フォーカス管理のためのRef
+ const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
+ const closeBtnRef = useRef<HTMLDivElement | null>(null);
+ const lastFocusableElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      // 開く直前にフォーカスがあった要素を保存
      const active = document.activeElement;
      if (active instanceof HTMLElement) triggerRef.current = active;

      // タイトルにフォーカス
      titleRef.current?.focus();

+     // フォーカストラップ用：最後のフォーカス可能要素を保存
+     const root = dialogRef.current;
+     if (root) {
+       const focusableElements = Array.from(
+         root.querySelectorAll<HTMLElement>(focusableSelector)
+       ).filter(
+         (el) =>
+           !el.hasAttribute("disabled") &&
+           el.getAttribute("aria-hidden") !== "true"
+       );

+       lastFocusableElementRef.current =
+         focusableElements[focusableElements.length - 1] ?? null;
+     } else {
+       lastFocusableElementRef.current = null;
+     }
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div>
      {/* オーバーレイ */}
      <div onClick={onClose}></div>

+     {/* フォーカストラップ（ダイアログ最下部フォーカス可能要素にフォーカスを渡す） */}
+     <div
+       onFocus={() => {
+         lastFocusableElementRef.current?.focus();
+       }}
+       tabIndex={0}
+     ></div>

-     <div role='dialog' aria-modal aria-labelledby={titleId}>
+     <div ref={dialogRef} role='dialog' aria-modal aria-labelledby={titleId}>
        <A11yButton
+         ref={closeBtnRef}
          onClick={onClose}
          aria-label='ダイアログを閉じる'
        >
          ×
        </A11yButton>
        <div
          id={titleId}
          ref={titleRef}
          role='heading'
          aria-level={2}
          // ダイアログ初期表示時に、フォーカスインジケーターが表示されないようにするためのリセットCSSクラス
          className='outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0'
        >
          {title}
        </div>
        {children}
      </div>

+     {/* フォーカストラップ（ダイアログ最上部フォーカス可能要素にフォーカスを渡す） */}
+     <div
+       onFocus={() => {
+         closeBtnRef.current?.focus();
+       }}
+       tabIndex={0}
+     ></div>
    </div>
  );
};

```

:::

#### キーボードからダイアログを閉じることができるようにする

:::details vsa

```diff
"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { A11yButton } from "./button";

interface A11yDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// フォーカス可能要素
const focusableSelector = [
  "[tabindex]:not([tabindex='-1'])",
  "input",
  "select",
  "textarea",
].join(",");

export const A11yDialog = ({
  title,
  open,
  onClose,
  children,
}: A11yDialogProps) => {
  const titleId = useId();
  // フォーカス管理のためのRef
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLDivElement | null>(null);
  const lastFocusableElementRef = useRef<HTMLElement | null>(null);

+ const handleEscKeyDown = useCallback(
+   (e: KeyboardEvent) => {
+     if (e.key === "Escape") {
+       e.preventDefault();
+       onClose();
+     }
+   },
+   [onClose]
+ );

  useEffect(() => {
    if (open) {
      // 開く直前にフォーカスがあった要素を保存
      const active = document.activeElement;
      if (active instanceof HTMLElement) triggerRef.current = active;

      // タイトルにフォーカス
      titleRef.current?.focus();

      // フォーカストラップ用：最後のフォーカス可能要素を保存
      const root = dialogRef.current;
      if (root) {
        const focusableElements = Array.from(
          root.querySelectorAll<HTMLElement>(focusableSelector)
        ).filter(
          (el) =>
            !el.hasAttribute("disabled") &&
            el.getAttribute("aria-hidden") !== "true"
        );

        lastFocusableElementRef.current =
          focusableElements[focusableElements.length - 1] ?? null;
      } else {
        lastFocusableElementRef.current = null;
      }

+     // Esc でダイアログを閉じることができるようにイベントリスナーを追加
+     window.addEventListener("keydown", handleEscKeyDown);
+     // クリーンアップ関数でイベントリスナーを削除
+     return () => {
+       window.removeEventListener("keydown", handleEscKeyDown);
+     };
    } else {
      triggerRef.current?.focus();
+     return;
    }
  }, [open, handleEscKeyDown]);

  if (!open) {
    return null;
  }

  return (
    <div>
      {/* オーバーレイ */}
      <div onClick={onClose}></div>

      {/* フォーカストラップ（ダイアログ最下部フォーカス可能要素にフォーカスを渡す） */}
      <div
        onFocus={() => {
          lastFocusableElementRef.current?.focus();
        }}
        tabIndex={0}
      ></div>

      <div ref={dialogRef} role='dialog' aria-modal aria-labelledby={titleId}>
        <A11yButton
          ref={closeBtnRef}
          onClick={onClose}
          aria-label='ダイアログを閉じる'
        >
          ×
        </A11yButton>
        <div
          id={titleId}
          ref={titleRef}
          role='heading'
          aria-level={2}
          tabIndex={-1}
          // ダイアログ初期表示時に、フォーカスインジケーターが表示されないようにするためのリセットCSSクラス
          className='outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0'
        >
          {title}
        </div>
        {children}
      </div>

      {/* フォーカストラップ（ダイアログ最上部フォーカス可能要素にフォーカスを渡す） */}
      <div
        onFocus={() => {
          closeBtnRef.current?.focus();
        }}
        tabIndex={0}
      ></div>
    </div>
  );
};

```

:::

#### 完成したダイアログコンポーネント

GIF 入れたいな

:::details 最終的なダイアログコンポーネント（スタイルなし）

```js
"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { A11yButton } from "./button";

interface A11yDialogProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// フォーカス可能要素
const focusableSelector = [
  "[tabindex]:not([tabindex='-1'])",
  "input",
  "select",
  "textarea",
].join(",");

export const A11yDialog = ({
  title,
  open,
  onClose,
  children,
}: A11yDialogProps) => {
  const titleId = useId();
  // フォーカス管理のためのRef
  const dialogRef = (useRef < HTMLDivElement) | (null > null);
  const triggerRef = (useRef < HTMLElement) | (null > null);
  const titleRef = (useRef < HTMLDivElement) | (null > null);
  const closeBtnRef = (useRef < HTMLDivElement) | (null > null);
  const lastFocusableElementRef = (useRef < HTMLElement) | (null > null);

  const handleEscKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      // 開く直前にフォーカスがあった要素を保存
      const active = document.activeElement;
      if (active instanceof HTMLElement) triggerRef.current = active;

      // タイトルにフォーカス
      titleRef.current?.focus();

      // フォーカストラップ用：最後のフォーカス可能要素を保存
      const root = dialogRef.current;
      if (root) {
        const focusableElements = Array.from(
          root.querySelectorAll < HTMLElement > focusableSelector
        ).filter(
          (el) =>
            !el.hasAttribute("disabled") &&
            el.getAttribute("aria-hidden") !== "true"
        );

        lastFocusableElementRef.current =
          focusableElements[focusableElements.length - 1] ?? null;
      } else {
        lastFocusableElementRef.current = null;
      }

      // Esc でダイアログを閉じることができるようにイベントリスナーを追加
      window.addEventListener("keydown", handleEscKeyDown);
      // クリーンアップ関数でイベントリスナーを削除
      return () => {
        window.removeEventListener("keydown", handleEscKeyDown);
      };
    } else {
      triggerRef.current?.focus();
      return;
    }
  }, [open, handleEscKeyDown]);

  if (!open) {
    return null;
  }
  return (
    <div>
      {/* オーバーレイ */}
      <div onClick={onClose}></div>

      {/* フォーカストラップ（ダイアログ最下部フォーカス可能要素にフォーカスを渡す） */}
      <div
        onFocus={() => {
          lastFocusableElementRef.current?.focus();
        }}
        tabIndex={0}
      ></div>
      <div ref={dialogRef} role='dialog' aria-modal aria-labelledby={titleId}>
        <A11yButton
          ref={closeBtnRef}
          onClick={onClose}
          aria-label='ダイアログを閉じる'
        >
          ×
        </A11yButton>
        <div
          id={titleId}
          ref={titleRef}
          role='heading'
          aria-level={2}
          tabIndex={-1}
          // ダイアログ初期表示時に、フォーカスインジケーターが表示されないようにするためのリセットCSSクラス
          className='outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0'
        >
          {title}
        </div>
        {children}
      </div>
      {/* フォーカストラップ（ダイアログ最上部フォーカス可能要素にフォーカスを渡す） */}
      <div
        onFocus={() => {
          closeBtnRef.current?.focus();
        }}
        tabIndex={0}
      ></div>
    </div>
  );
};
```

:::

### 3-3. エラー

:::details ダイアログのマークアップ

```js
interface A11yErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  errorText: string;
}

/** idプロパティを渡して、紐づけることを推奨する */
export const A11yError = ({ errorText, ...rest }: A11yErrorProps) => {
  return <div {...rest}>エラー：{errorText}</div>;
};
```

:::

#### 支援技術が適切にエラーを扱えるようにする

エラーを支援技術が適切に管理することを目的として、WAI-ARIA を活用します。
`aria-live` 属性を設定することで、要素の中身（`{errortext}`の部分）の変更を検知して、スクリーンリーダなどの支援技術が読み上げるようにします。`aria-atomic` をつけるのは、変更差分しか読み上げないところを、その直前の「エラー：」の部分もセットで読ませるようにすることを目的としています。
`aria-live` での監視は、`hidden` や そもそもレンダリングしないという場合、AOM から消えてしまい動作が安定しない可能性があるので、あくまで DOM には残すが読み上げさせたりはしないように隠すようにしています。

:::details 最終的なボタンコンポーネント（スタイルなし）

```diff
interface A11yErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  errorText: string;
}

/** idプロパティを渡して、紐づけることを推奨する */
export const A11yError = ({ errorText, ...rest }: A11yErrorProps) => {
  return (
    <div
      {...rest}
+     aria-live='polite'
+     aria-atomic
+     className={`${rest.className ?? ""} ${
+       errorText ? "" : "h-0 overflow-hidden"
+     }`}
    >
      エラー：{errorText}
    </div>
  );
};
```

:::

#### 完成したエラーコンポーネント

GIF 入れたいな

:::details 最終的なボタンコンポーネント（スタイルなし）

```js
interface A11yErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  errorText: string;
}

/** idプロパティを渡して、紐づけることを推奨する */
export const A11yError = ({ errorText, ...rest }: A11yErrorProps) => {
  return (
    <div
      {...rest}
      aria-live='polite'
      aria-atomic
      className={`${rest.className ?? ""} ${
        errorText ? "" : "h-0 overflow-hidden"
      }`}
    >
      {errorText}
    </div>
  );
};
```

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

### 3-5. その他のフォーム

:::details 最終的な Select コンポーネント（スタイルなし）

```js
"use client";

import { forwardRef, useId } from "react";
import { A11yError } from "./error";

interface Option {
  value: string | number;
  label: string;
}

interface A11ySelectProps extends React.ComponentPropsWithoutRef<"select"> {
  options: Option[];
  label?: string;
  errorText?: string;
}

export const A11ySelect = forwardRef<HTMLSelectElement, A11ySelectProps>(
  ({ options, label, errorText, ...rest }, ref) => {
    const autoId = useId();
    const formId = rest.id ?? autoId;
    const errorId = `${formId}-error`;
    const hasError = Boolean(errorText);

    return (
      <div>
        {label && <label htmlFor={formId}>{label}</label>}
        <select
          {...rest}
          ref={ref}
          id={formId}
          aria-invalid={hasError || undefined}
          aria-describedby={errorText ? errorId : undefined}
        >
          <option value="">選択してください</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <A11yError id={errorId} errorText={errorText ?? ""} />
      </div>
    );
  }
);

A11ySelect.displayName = "A11ySelect";
```

:::

:::details 最終的な Checkbox コンポーネント（スタイルなし）

```js
"use client";

import { forwardRef, useId } from "react";
import { A11yError } from "./error";

interface A11yCheckboxProps extends React.ComponentPropsWithoutRef<"input"> {
  label?: string;
  errorText?: string;
}

export const A11yCheckbox = forwardRef<HTMLInputElement, A11yCheckboxProps>(
  ({ label, errorText, ...rest }, ref) => {
    const autoId = useId();
    const formId = rest.id ?? autoId;
    const errorId = `${formId}-error`;
    const hasError = Boolean(errorText);

    return (
      <div>
        <input
          type="checkbox"
          {...rest}
          ref={ref}
          id={formId}
          aria-invalid={hasError || undefined}
          aria-describedby={errorText ? errorId : undefined}
        />
        {label && <label htmlFor={formId}>{label}</label>}
        <A11yError id={errorId} errorText={errorText ?? ""} />
      </div>
    );
  }
);

A11yCheckbox.displayName = "A11yCheckbox";

```

:::

これ以外に、
form もあるよ

### 3-6. Form コンポーネント

ここでは、form タグの機能を表現するようなコンポーネントを作成します。

:::details cs

```js
"use client";

import { forwardRef } from "react";

interface A11yFormProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const A11yForm = forwardRef<HTMLDivElement, A11yFormProps>(
  ({ children, ...rest }, ref) => {
    return (
      <div
        {...rest}
        ref={ref}
      >
        {children}
      </div>
    );
  }
);

A11yForm.displayName = "A11yForm";

```

:::

:::details dsa

```diff
"use client";

import { forwardRef } from "react";

interface A11yFormProps extends React.HTMLAttributes<HTMLDivElement> {
  onSubmit: () => void;
+ ariaLabel?: string;
  children: React.ReactNode;
}

export const A11yForm = forwardRef<HTMLDivElement, A11yFormProps>(
- ({ children, ...rest }, ref) => {
+ ({ children, ariaLabel, ...rest }, ref) => {
    return (
      <div
        {...rest}
        ref={ref}
+       role="form"
+       aria-label={ariaLabel}
      >
        {children}
      </div>
    );
  }
);

A11yForm.displayName = "A11yForm";

```

:::

:::details dsa

```diff
"use client";

import { forwardRef } from "react";

interface A11yFormProps extends React.HTMLAttributes<HTMLDivElement> {
+ onSubmit: () => void;
  ariaLabel?: string;
  children: React.ReactNode;
}

export const A11yForm = forwardRef<HTMLDivElement, A11yFormProps>(
- ({ children, ariaLabel, ...rest }, ref) => {
+ ({ onSubmit, children, ariaLabel, ...rest }, ref) => {
    return (
      <div
        {...rest}
        ref={ref}
        role="form"
        aria-label={ariaLabel}
+       onKeyDown={(e) => {
+         if (
+           e.key === "Enter" &&
+           !e.nativeEvent.isComposing &&
+           (e.target instanceof HTMLInputElement ||
+             e.target instanceof HTMLSelectElement)
+         ) {
+           onSubmit();
+         }
+         rest.onKeyDown?.(e);
+       }}
      >
        {children}
      </div>
    );
  }
);

A11yForm.displayName = "A11yForm";

```

:::

:::details cs

```js
"use client";

import { forwardRef } from "react";

interface A11yFormProps extends React.HTMLAttributes<HTMLDivElement> {
  onSubmit: () => void;
  ariaLabel?: string;
  children: React.ReactNode;
}

export const A11yForm = forwardRef<HTMLDivElement, A11yFormProps>(
  ({ onSubmit, children, ariaLabel, ...rest }, ref) => {
    return (
      <div
        {...rest}
        ref={ref}
        role="form"
        aria-label={ariaLabel}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            !e.nativeEvent.isComposing &&
            (e.target instanceof HTMLInputElement ||
              e.target instanceof HTMLSelectElement)
          ) {
            onSubmit();
          }
          rest.onKeyDown?.(e);
        }}
      >
        {children}
      </div>
    );
  }
);

A11yForm.displayName = "A11yForm";

```

:::

## 支援技術

何か書きたいなとは思っているが、、、、

## まとめ
