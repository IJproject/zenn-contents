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
