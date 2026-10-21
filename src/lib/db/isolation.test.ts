import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = new URL(
  "../../../drizzle/0000_rare_wither.sql",
  import.meta.url,
);

test("PostgreSQL schema rejects transactions using another profile's category", async () => {
  const db = new PGlite();
  try {
    const sql = (await readFile(migration, "utf8")).replaceAll(
      "--> statement-breakpoint",
      "",
    );
    await db.exec(
      "create schema auth; create table auth.users (id uuid primary key)",
    );
    await db.exec(sql);
    const userA = "11111111-1111-4111-8111-111111111111";
    const userB = "22222222-2222-4222-8222-222222222222";
    await db.query("insert into auth.users (id) values ($1), ($2)", [userA, userB]);
    const a = await db.query<{ id: string }>(
      "insert into profiles (supabase_user_id, display_name) values ($1, 'A') returning id",
      [userA],
    );
    const b = await db.query<{ id: string }>(
      "insert into profiles (supabase_user_id, display_name) values ($1, 'B') returning id",
      [userB],
    );
    const category = await db.query<{ id: string }>(
      "insert into categories (profile_id, name, kind) values ($1, 'Food', 'expense') returning id",
      [a.rows[0].id],
    );
    await assert.rejects(
      db.query(
        "insert into transactions (profile_id, category_id, kind, amount, currency, occurred_on) values ($1, $2, 'expense', 12.34, 'INR', '2026-10-21')",
        [b.rows[0].id, category.rows[0].id],
      ),
    );
    const visibleToB = await db.query(
      "select id from transactions where profile_id = $1",
      [b.rows[0].id],
    );
    assert.equal(visibleToB.rows.length, 0);
  } finally {
    await db.close();
  }
});
