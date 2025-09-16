import { query } from "./db.js";

async function main() {
  const tables = [
    "single_b_tree_products",
    "nothing_b_tree_products",
    "double_b_tree_products",
  ];

  console.log("=== ウォームアップ中... ===");
  for (const t of tables) {
    await query(`SELECT COUNT(*) FROM ${t}`);
    await query(
      `SELECT id, name, price FROM ${t} WHERE price >= 50000 ORDER BY price DESC LIMIT 100`
    );
  }
  console.log("=== ウォームアップ完了 ===");

  console.log("=== 測定開始 ===");
  const minPrice = 99900;
  const iteration = 30;
  for (const t of tables) {
    const times = [];
    let rows;
    for (let i = 0; i < iteration; i++) {
      const result = await query(`SELECT COUNT(*)::int AS cnt FROM ${t}`);
      times.push(result.resTime);
      if (i === 0) rows = result.rows;
    }
    const avgResTime1 = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(
      `[${t}](no-filter): rowCount=${rows[0].cnt}, resTime=${avgResTime1.toFixed(
        2
      )}(ms)`
    );

    const times2 = [];
    let rowCount;
    for (let i = 0; i < iteration; i++) {
      const result = await query(
        `SELECT id, name, price
         FROM ${t}
        WHERE price >= $1
        ORDER BY price ASC
        LIMIT 100`,
        [minPrice]
      );
      times2.push(result.resTime);
      if (i === 0) rowCount = result.rowCount;
    }
    const avgResTime2 = times2.reduce((a, b) => a + b, 0) / times2.length;
    console.log(
      `[${t}](where+sort): rowCount=${rowCount}, resTime=${avgResTime2.toFixed(
        2
      )}(ms)`
    );

    const times3 = [];
    let rowCount3;
    for (let i = 0; i < iteration; i++) {
      const result = await query(
        `SELECT id, name, price
         FROM ${t}
        WHERE price >= $1
        LIMIT 100`,
        [minPrice]
      );
      times3.push(result.resTime);
      if (i === 0) rowCount3 = result.rowCount;
    }
    const avgResTime3 = times3.reduce((a, b) => a + b, 0) / times3.length;
    console.log(
      `[${t}](where-only): rowCount=${rowCount3}, resTime=${avgResTime3.toFixed(
        2
      )}(ms)`
    );

    const times4 = [];
    let rowCount4;
    for (let i = 0; i < iteration; i++) {
      const result = await query(
        `SELECT id, name, price
         FROM ${t}
        ORDER BY price ASC
        LIMIT 100`, []
      );
      times4.push(result.resTime);
      if (i === 0) rowCount4 = result.rowCount;
    }
    const avgResTime4 = times4.reduce((a, b) => a + b, 0) / times4.length;
    console.log(
      `[${t}](sort-only): rowCount=${rowCount4}, resTime=${avgResTime4.toFixed(
        2
      )}(ms)`
    );
  }
  console.log("=== 測定終了 ===");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
