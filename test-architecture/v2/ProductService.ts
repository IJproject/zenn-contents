import { nodeMailerClient } from "./libs/nodemailer";
import { axiosClient } from "./libs/axios";

type Product = {
  id: number;
  name: string;
  price: number; // 税抜価格
};

export class ProductService {
  private taxRate: number = 0.1;

  /**
   * @description 商品情報をIDから取得する
   */
  async fetchProduct(props: { productId: number }): Promise<Product> {
    try {
      const response = await axiosClient.get<Product>(
        `/products/${props.productId}`
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
      await nodeMailerClient.sendMail({
        from: '"Your App Name" <your_username@example.com>',
        to: props.to,
        subject: props.subject,
        text: props.body,
      });
    } catch (error) {
      throw new Error("メール送信に失敗しました");
    }
  }

  /**
   * @description 商品情報をメールで送信する
   */
  async sendProductInfoByEmail(
    productId: number,
    email: string
  ): Promise<void> {
    const productInfo = await this.getProcessedProductInfo({
      productId: productId,
    });
    this.sendEmail({
      to: email,
      subject: "商品情報のお知らせ",
      body: productInfo,
    });
  }
}
