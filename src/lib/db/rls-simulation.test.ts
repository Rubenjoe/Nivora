import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const schemaMigration = new URL(
  "../../../drizzle/0000_rare_wither.sql",
  import.meta.url,
);
const grantsMigration = new URL(
  "../../../drizzle/0001_0001_grants_hardening.sql",
  import.meta.url,
);

test("RLS simulation hides another user's transactions and blocks mutations", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create schema auth; create table auth.users (id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$",
    );
    const schemaSql = (await readFile(schemaMigration, "utf8")).replaceAll(
      "--> statement-breakpoint",
      "",
    );
    await db.exec(schemaSql);
    await db.exec(await readFile(grantsMigration, "utf8"));
    await db.exec(
      "grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated",
    );

    const userA = "11111111-1111-4111-8111-111111111111";
    const userB = "22222222-2222-4222-8222-222222222222";
    await db.query("insert into auth.users (id) values ($1), ($2)", [
      userA,
      userB,
    ]);
    const profiles = await db.query<{ id: string }>(
      "insert into profiles (supabase_user_id, display_name) values ($1, 'A'), ($2, 'B') returning id",
      [userA, userB],
    );
    const categoryRows = await db.query<{ id: string }>(
      "insert into categories (profile_id, name, kind) values ($1, 'Food A', 'expense'), ($2, 'Food B', 'expense') returning id",
      [profiles.rows[0].id, profiles.rows[1].id],
    );
    const transactionRows = await db.query<{ id: string }>(
      "insert into transactions (profile_id, category_id, kind, amount, currency, occurred_on) values ($1, $2, 'expense', 250.00, 'INR', '2026-10-21'), ($3, $4, 'expense', 500.00, 'INR', '2026-10-21') returning id",
      [
        profiles.rows[0].id,
        categoryRows.rows[0].id,
        profiles.rows[1].id,
        categoryRows.rows[1].id,
      ],
    );

    await db.exec("begin; set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [
      userA,
    ]);
    const visibleToA = await db.query<{ id: string }>(
      "select id from transactions order by id",
    );
    assert.deepEqual(
      visibleToA.rows.map((row) => row.id),
      [transactionRows.rows[0].id],
    );
    await db.exec("rollback");

    await db.exec("begin; set local role authenticated");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [
      userB,
    ]);
    const visibleToB = await db.query<{ id: string }>(
      "select id from transactions order by id",
    );
    assert.deepEqual(
      visibleToB.rows.map((row) => row.id),
      [transactionRows.rows[1].id],
    );
    const updateOtherUser = await db.query(
      "update transactions set amount = 999.00 where id = $1 returning id",
      [transactionRows.rows[0].id],
    );
    const deleteOtherUser = await db.query(
      "delete from transactions where id = $1 returning id",
      [transactionRows.rows[0].id],
    );
    assert.equal(updateOtherUser.rows.length, 0);
    assert.equal(deleteOtherUser.rows.length, 0);
    await db.exec("rollback");

    const unchanged = await db.query<{ amount: string }>(
      "select amount from transactions where id = $1",
      [transactionRows.rows[0].id],
    );
    assert.equal(unchanged.rows[0].amount, "250.0000");
  } finally {
    await db.close();
  }
});
