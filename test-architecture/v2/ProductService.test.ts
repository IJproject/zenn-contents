/**
 * 実行コマンド
 * npm run test -- ProductService.test.ts
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductService } from "./ProductService";
import { axiosClient } from "./libs/axios";
import { nodeMailerClient } from "./libs/nodemailer";

// テストデータ
const sampleProduct = {
  id: 1,
  name: "テスト商品",
  price: 1000,
};

const sampleProductId = 1;
const sampleEmail = "test@example.com";

describe("商品サービスのテスト", () => {
  let sutService: ProductService;

  beforeEach(() => {
    sutService = new ProductService();
    vi.clearAllMocks();
    // プロセス外依存のメソッドレベルでモックを配置
    vi.spyOn(axiosClient, "get");
    vi.spyOn(nodeMailerClient, "sendMail");
  });

  describe("fetchProduct", () => {
    describe("正常系", () => {
      it("商品IDを指定して商品情報を取得できる場合、商品情報を返す", async () => {
        // Arrange
        vi.mocked(axiosClient.get).mockResolvedValue({
          data: sampleProduct,
        });

        // Act
        const result = await sutService.fetchProduct({
          productId: sampleProductId,
        });

        // Assert
        expect(result).toEqual(sampleProduct);
        expect(axiosClient.get).toHaveBeenCalledWith(
          `/products/${sampleProductId}`
        );
      });
    });

    describe("異常系", () => {
      it("APIリクエストが失敗した場合、エラーを投げる", async () => {
        // Arrange
        vi.mocked(axiosClient.get).mockRejectedValue(
          new Error("Network Error")
        );

        // Act & Assert
        try {
          await sutService.fetchProduct({ productId: sampleProductId });
          throw new Error("エラーが投げられなければ、テストを失敗させる");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("商品情報の取得に失敗しました");
        }
      });
    });
  });

  describe("calculateTaxIncludedPrice", () => {
    describe("正常系", () => {
      it("税抜価格から税込価格を計算できる場合、税込価格を返す", () => {
        // Arrange
        const price = 1000;
        const expectedTaxIncludedPrice = 1100; // 10%税込

        // Act
        const result = sutService.calculateTaxIncludedPrice({ price });

        // Assert
        expect(result).toBe(expectedTaxIncludedPrice);
      });

      it("端数がある場合、四捨五入した税込価格を返す", () => {
        // Arrange
        const price = 999;
        const expectedTaxIncludedPrice = 1099; // 999 * 1.1 = 1098.9 → 1099

        // Act
        const result = sutService.calculateTaxIncludedPrice({ price });

        // Assert
        expect(result).toBe(expectedTaxIncludedPrice);
      });
    });
  });

  describe("getProcessedProductInfo", () => {
    describe("正常系", () => {
      it("商品情報を取得して加工できる場合、フォーマットされた文字列を返す", async () => {
        // Arrange
        vi.mocked(axiosClient.get).mockResolvedValue({
          data: sampleProduct,
        });
        const expectedString = "商品名: テスト商品 / 税込価格: ¥1100";

        // Act
        const result = await sutService.getProcessedProductInfo({
          productId: sampleProductId,
        });

        // Assert
        expect(result).toBe(expectedString);
      });
    });

    describe("異常系", () => {
      it("商品情報の取得に失敗した場合、エラーを投げる", async () => {
        // Arrange
        vi.mocked(axiosClient.get).mockRejectedValue(
          new Error("Network Error")
        );

        // Act & Assert
        try {
          await sutService.getProcessedProductInfo({
            productId: sampleProductId,
          });
          throw new Error("エラーが投げられなければ、テストを失敗させる");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("商品情報の取得に失敗しました");
        }
      });
    });
  });

  describe("sendEmail", () => {
    describe("正常系", () => {
      it("メール送信に成功した場合、正常に処理を終了する", async () => {
        // Arrange
        vi.mocked(nodeMailerClient.sendMail).mockResolvedValue(undefined);
        const emailData = {
          to: sampleEmail,
          subject: "テストメール",
          body: "テスト本文",
        };

        // Act
        await sutService.sendEmail(emailData);

        // Assert
        expect(nodeMailerClient.sendMail).toHaveBeenCalledWith({
          from: '"Your App Name" <your_username@example.com>',
          to: emailData.to,
          subject: emailData.subject,
          text: emailData.body,
        });
      });
    });

    describe("異常系", () => {
      it("メール送信に失敗した場合、エラーを投げる", async () => {
        // Arrange
        vi.mocked(nodeMailerClient.sendMail).mockRejectedValue(
          new Error("SMTP Error")
        );
        const emailData = {
          to: sampleEmail,
          subject: "テストメール",
          body: "テスト本文",
        };

        // Act & Assert
        try {
          await sutService.sendEmail(emailData);
          throw new Error("エラーが投げられなければ、テストを失敗させる");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("メール送信に失敗しました");
        }
      });
    });
  });

  describe("sendProductInfoByEmail", () => {
    describe("正常系", () => {
      it("商品情報をメールで送信できる場合、正常に処理を終了する", async () => {
        // Arrange
        vi.mocked(axiosClient.get).mockResolvedValue({
          data: sampleProduct,
        });
        vi.mocked(nodeMailerClient.sendMail).mockResolvedValue(undefined);
        // Act
        await sutService.sendProductInfoByEmail(sampleProductId, sampleEmail);

        // Assert
        expect(nodeMailerClient.sendMail).toHaveBeenCalledWith({
          from: '"Your App Name" <your_username@example.com>',
          to: sampleEmail,
          subject: "商品情報のお知らせ",
          text: "商品名: テスト商品 / 税込価格: ¥1100",
        });
      });
    });

    describe("異常系", () => {
      it("商品情報の取得に失敗した場合、エラーを投げる", async () => {
        // Arrange
        vi.mocked(axiosClient.get).mockRejectedValue(
          new Error("Network Error")
        );

        // Act & Assert
        try {
          await sutService.sendProductInfoByEmail(
            sampleProductId,
            sampleEmail
          );
          throw new Error("エラーが投げられなければ、テストを失敗させる");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("商品情報の取得に失敗しました");
        }
      });

      it("商品情報は取得できたがメール送信に失敗した場合、エラーを投げる", async () => {
        // Arrange
        vi.mocked(axiosClient.get).mockResolvedValue({
          data: sampleProduct,
        });
        vi.mocked(nodeMailerClient.sendMail).mockRejectedValue(
          new Error("SMTP Error")
        );

        // Act & Assert
        try {
          await sutService.sendProductInfoByEmail(
            sampleProductId,
            sampleEmail
          );
          throw new Error("エラーが投げられなければ、テストを失敗させる");
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe("メール送信に失敗しました");
        }
      });
    });
  });
});