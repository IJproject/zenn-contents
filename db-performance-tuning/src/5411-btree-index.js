import { query } from "./db.js";

async function main() {
  const tables = [
    "nothing_b_tree_products",
    "single_b_tree_products",
    "double_b_tree_products",
  ];

  for (const t of tables) {
    // 取得条件なしのレスポンス速度測定
    const { rows, resSpeed: resSpeed1 } = await query(
      `SELECT COUNT(*)::int AS cnt FROM ${t}`
    );
    console.log(
      `[${t}](no-filter): rowCount=${rows[0].cnt}, resSpeed=${resSpeed1.toFixed(
        2
      )}(ms)\n`
    );

    // 取得条件ありのレスポンス速度測定
    const minPrice = 10000;
    const { rowCount, resSpeed: resSpeed2 } = await query(
      `SELECT id, name, price
       FROM ${t}
      WHERE price >= $1
      ORDER BY price DESC
      LIMIT 5`,
      [minPrice]
    );
    console.log(
      `[${t}](filter): returned=${rowCount}, resSpeed=${resSpeed2.toFixed(
        2
      )}(ms)\n`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
