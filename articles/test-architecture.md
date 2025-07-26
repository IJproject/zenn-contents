---
title: "可愛がりたくなるようなテストコードを作りたいんだ（真顔）"
emoji: "🫶"
type: "idea"
topics:
  - "テスト設計"
  - "test"
  - "typescript"
  - "jest"
  - "vitest"
published: false
---

## はじめに

### この記事について

25卒新米エンジニアの岩田と申します。

テストコードを書いたことがないエンジニア、またはAIに書かせるだけで思想がまるでない私のようなエンジニアにとって、テストコードの作成に対してこのような印象を持っていることに共感していただける方が多いのかなと思っています。

- テストコードを書くための構文を覚えるのが面倒臭くて、テストコード自体を読むこと自体に拒絶反応を起こす
- そもそも何をどの粒度でテストをすれば良いのか分からないために手をつけられない
- とりあえずAIにテストコードを作成してもらったけど、善し悪しを評価できないためにそのままコミットすることしかできない

自分も含め、上記の状態で作成されるテストコードは、もはや作成されたというよりは生成されたという表現の方が正しく感じるほどです。このようなテストコードはほぼ100%、開発途中で忘れ去られるか、開発スピードを下げるボトルネックとして鎮座し続けることになってしまうかと思います。

そこで、後で紹介させていただきますが、テスト設計に関する書籍に手を伸ばして勉強してみました。そうすると、自分の中である程度テスト設計についての思想を持つことができるようになりました。この記事では実際にそれにより得られた知識を使って、保守性の欠片もないコードをリファクタリングしながらテストコードを作成していきたいと思います。

この記事は自分の知識をアウトプットして定着させることを第一の目的として書きましたが、私と同じような方々の羅針盤になったとしたら、この上なく喜ばしく思います。また、中身のレベルとして偏った視点からでの見方が散見されるかと思いますので、ご容赦いただきたいことに加えて、ご教授いただけますと幸いです。

### 対象者

この記事の読者としては、以下を想定しています。

- 紹介書籍を購入しようか迷っている方
- テストコードを書こうと思ったが、何をどの粒度で書けばいいか分からずに諦めてしまった方
- テストコードを書いた経験はあるが、なんとなくでしか書いたことのない方

### 参考書籍紹介

https://book.mynavi.jp/ec/products/detail/id=134252

### サンプルコード

説明用のプログラムとして、ショッピングサイトで使えそうで使えないものを作成してみました。機能面もそこまで深くは考えていないので、関数ごとの関係や外部のソフトウェアとの連携などの技術的な側面のみに目を当ててくださると非常に助かります。
初期状態として、ひとつのファイル内のひとつの関数に全ての機能を盛り込んだ状態からスタートします。そんな禍々しい初期状態のコードは、以下のアコーディオンを開くと閲覧することができます。

:::details 初期状態
```ts:テスト
import nodemailer from "nodemailer";
import axios, { AxiosRequestConfig } from "axios";

type Product = {
  id: number;
  name: string;
  price: number; // 税抜価格
};

export class ProductService {
  private apiUrl: string = "https://example.com/api";
  private taxRate: number = 0.1;
  private transporter = nodemailer.createTransport({
    host: "smtp.example.com", // 例: smtp.gmail.com
    port: 587,
    secure: false, // TLS
    auth: {
      user: "test@example.com",
      pass: "password",
    },
  });

  /**
   * @description 商品情報をIDから取得する
   */
  async fetchProduct(props: { productId: number }): Promise<Product> {
    const config: AxiosRequestConfig = {
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
      withCredentials: true,
    };

    try {
      const response = await axios.get<Product>(
        `${this.apiUrl}/products/${props.productId}`,
        config
      );
      return response.data;
    } catch (error) {
      throw new Error("商品情報の取得に失敗しました");
    }
  }

  /**
   * @description 税込価格に補正する
   */
  calculateTaxIncludedPrice(props: { price: number }): number {
    return Math.round(props.price * (1 + this.taxRate));
  }

  /**
   * @description 商品情報を加工して、名前と税込価格を返す
   */
  async getProcessedProductInfo(props: { productId: number }): Promise<string> {
    const product = await this.fetchProduct({ productId: props.productId });
    const taxIncluded = this.calculateTaxIncludedPrice({
      price: product.price,
    });
    return `商品名: ${product.name} / 税込価格: ¥${taxIncluded}`;
  }

  /**
   * @description メールを送信する
   */
  async sendEmail(props: {
    to: string;
    subject: string;
    body: string;
  }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: '"Your App Name" <your_username@example.com>',
        to: props.to,
        subject: props.subject,
        text: props.body,
      });
      console.log(`メールを送信しました: ${props.to}`);
    } catch (error) {
      console.error("メール送信に失敗しました:", error);
      throw new Error("メール送信に失敗しました");
    }
  }

  /**
   * @description 商品情報をメールで送信する
   */
  async sendProductInfoByEmail(props: {
    productId: number;
    email: string;
  }): Promise<void> {
    const productInfo = await this.getProcessedProductInfo({
      productId: props.productId,
    });
    this.sendEmail({
      to: props.email,
      subject: "商品情報のお知らせ",
      body: productInfo,
    });
  }
}
```
:::

私の作成した最悪傑作はいかがでしたか？
この規模感であれば管理のしようがありますが、これが大規模なプロジェクトでまかり通ってしまった暁には、巷でいう「大きな泥団子」になってしまいます。そもそもこんなコードを作ろうとする知的生命体が地球上にいるのかどうかというのは置いといて。この泥団子を３色団子のように役割を明確に分割して管理のしやすいコードへ変化させ、さらに管理コストを削減するためのテストコードを書いていこうと思います。

:::message
GPTに仕様を伝えてコードの大半を作成してもらいましたが、なんせGPTは優秀ゆえ読みやすいコードを生成してくれるので、生成してくれたものに手を加えて改悪するのにぼちぼち時間を要しました。普段の使い方とは真逆で、いつもとは脳みその別の部分を使っている感覚が何かと新鮮で楽しかったので、あまりにも暇を持て余している方は是非やってみてください。
:::

## テスト設計の考え方

まずは、テスト設計について考える上での根底の認識の擦り合わせをしようと思います。

### 質の高いテストコードの定義

### 単体テストと結合テスト

## コードのリファクタリング

まずは効果の高いテストコードを作成するためにプロダクションコードのリファクタリングをします。テストコードの質は、それ中身自体にも当たり前に依存することに加え、プロダクションコードの設計にも強く依存します。

### プロセス外依存の隔離

### プロダクションコードの分類

## テストコードの作成

ここから本題のテストコードの作成をしていきます。

### テスト対象と方法の決定

### モックの使用

### 出力値ベーステスト

### 3Aパターン（Arrange-Act-Assert）

## おわりに

### ClaudeCode対応

私がテストをClaudeCodeに作成させる際に読み込ませるCLAUDE.mdを置いておきます。ここまで紹介したテスト設計の考え方をまとめているだけのものです。もしよければ使ってください。

:::details テスト作成特化の CLAUDE.md
```md:CLAUDE.md
## テスト
```
:::