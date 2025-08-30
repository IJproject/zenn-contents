import "dotenv/config";
import { Pool } from "pg";

const { PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD } = process.env;

export const pool = new Pool({
  host: PG_HOST,
  port: Number(PG_PORT),
  database: PG_DATABASE,
  user: PG_USER,
  password: PG_PASSWORD,
});

export async function query(text, params) {
  const client = await pool.connect();
  const started = process.hrtime.bigint();
  try {
    const res = await client.query(text, params);
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    return { rows: res.rows, rowCount: res.rowCount, resTime: ms };
  } finally {
    client.release();
  }
}
