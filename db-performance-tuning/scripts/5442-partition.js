import { query } from "./db.js";

async function main() {
  const tables = [
    "no_partition_orders",
    "range_partition_orders",
    "list_partition_orders",
    "hash_partition_orders"
  ];
  const iteration = 10;

  console.log("=== ウォームアップ中... ===");
  for (const t of tables) {
    await query(`SELECT COUNT(*) FROM ${t}`);
  }
  console.log("=== ウォームアップ完了 ===\n");

  // ===============================
  // 1. レンジパーティションの測定（日付範囲検索）
  // ===============================
  console.log("=== レンジパーティション測定 (日付範囲検索) ===");
  const rangeTests = [
    { name: "no_partition_orders", desc: "パーティションなし" },
    { name: "range_partition_orders", desc: "レンジパーティション" }
  ];

  for (const test of rangeTests) {
    // 特定月のデータ検索
    const times1 = [];
    for (let i = 0; i < iteration; i++) {
      const result = await query(
        `SELECT COUNT(*) as cnt
         FROM ${test.name}
         WHERE order_date >= '2024-03-01' AND order_date < '2024-04-01'`
      );
      times1.push(result.resTime);
    }
    const avgTime1 = times1.reduce((a, b) => a + b, 0) / times1.length;
    console.log(`[${test.desc}] 1ヶ月検索: ${avgTime1.toFixed(2)}ms`);

    // 複数月のデータ検索
    const times2 = [];
    for (let i = 0; i < iteration; i++) {
      const result = await query(
        `SELECT COUNT(*) as cnt
         FROM ${test.name}
         WHERE order_date >= '2024-06-01' AND order_date < '2024-09-01'`
      );
      times2.push(result.resTime);
    }
    const avgTime2 = times2.reduce((a, b) => a + b, 0) / times2.length;
    console.log(`[${test.desc}] 3ヶ月検索: ${avgTime2.toFixed(2)}ms`);
  }

  // ===============================
  // 2. リストパーティションの測定（地域検索）
  // ===============================
  console.log("\n=== リストパーティション測定 (地域検索) ===");
  const listTests = [
    { name: "no_partition_orders", desc: "パーティションなし" },
    { name: "list_partition_orders", desc: "リストパーティション" }
  ];

  for (const test of listTests) {
    // 単一地域の検索
    const times1 = [];
    for (let i = 0; i < iteration; i++) {
      const result = await query(
        `SELECT COUNT(*) as cnt
         FROM ${test.name}
         WHERE region = 'japan'`
      );
      times1.push(result.resTime);
    }
    const avgTime1 = times1.reduce((a, b) => a + b, 0) / times1.length;
    console.log(`[${test.desc}] 単一地域検索: ${avgTime1.toFixed(2)}ms`);

    // 複数地域の検索
    const times2 = [];
    for (let i = 0; i < iteration; i++) {
      const result = await query(
        `SELECT COUNT(*) as cnt
         FROM ${test.name}
         WHERE region IN ('usa', 'canada', 'mexico')`
      );
      times2.push(result.resTime);
    }
    const avgTime2 = times2.reduce((a, b) => a + b, 0) / times2.length;
    console.log(`[${test.desc}] 複数地域検索: ${avgTime2.toFixed(2)}ms`);
  }

  // ===============================
  // 3. ハッシュパーティションの測定（顧客ID検索）
  // ===============================
  console.log("\n=== ハッシュパーティション測定 (顧客ID検索) ===");
  const hashTests = [
    { name: "no_partition_orders", desc: "パーティションなし" },
    { name: "hash_partition_orders", desc: "ハッシュパーティション" }
  ];

  for (const test of hashTests) {
    // 特定顧客の全注文検索（ハッシュパーティションの最適ケース）
    const times1 = [];
    for (let i = 0; i < iteration; i++) {
      const result = await query(
        `SELECT COUNT(*) as cnt, SUM(amount) as total
         FROM ${test.name}
         WHERE customer_id = 12345`
      );
      times1.push(result.resTime);
    }
    const avgTime1 = times1.reduce((a, b) => a + b, 0) / times1.length;
    console.log(`[${test.desc}] 特定顧客の全注文集計: ${avgTime1.toFixed(2)}ms`);

    // 複数の特定顧客検索（IN句使用）
    const times2 = [];
    for (let i = 0; i < iteration; i++) {
      const result = await query(
        `SELECT customer_id, COUNT(*) as cnt
         FROM ${test.name}
         WHERE customer_id IN (12345, 23456, 34567, 45678, 56789)
         GROUP BY customer_id`
      );
      times2.push(result.resTime);
    }
    const avgTime2 = times2.reduce((a, b) => a + b, 0) / times2.length;
    console.log(`[${test.desc}] 複数特定顧客の個別集計: ${avgTime2.toFixed(2)}ms`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});