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
      "create role authenticated; create schema auth; create table auth.users (id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$",
    );
    await db.exec(sql);
    const userA = "11111111-1111-4111-8111-111111111111";
    const userB = "22222222-2222-4222-8222-222222222222";
    await db.query("insert into auth.users (id) values ($1), ($2)", [
      userA,
      userB,
    ]);
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

test("PostgreSQL schema rejects a transaction whose kind differs from its category", async () => {
  const db = new PGlite();
  try {
    const sql = (await readFile(migration, "utf8")).replaceAll(
      "--> statement-breakpoint",
      "",
    );
    await db.exec(
      "create role authenticated; create schema auth; create table auth.users (id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$",
    );
    await db.exec(sql);
    const userId = "11111111-1111-4111-8111-111111111111";
    await db.query("insert into auth.users (id) values ($1)", [userId]);
    const profile = await db.query<{ id: string }>(
      "insert into profiles (supabase_user_id, display_name) values ($1, 'A') returning id",
      [userId],
    );
    const category = await db.query<{ id: string }>(
      "insert into categories (profile_id, name, kind) values ($1, 'Salary', 'income') returning id",
      [profile.rows[0].id],
    );
    await assert.rejects(
      db.query(
        "insert into transactions (profile_id, category_id, kind, amount, currency, occurred_on) values ($1, $2, 'expense', 12.34, 'INR', '2026-10-21')",
        [profile.rows[0].id, category.rows[0].id],
      ),
    );
  } finally {
    await db.close();
  }
});

test("deleting a profile cascades through its categories and transactions", async () => {
  const db = new PGlite();
  try {
    const sql = (await readFile(migration, "utf8")).replaceAll(
      "--> statement-breakpoint",
      "",
    );
    await db.exec(
      "create role authenticated; create schema auth; create table auth.users (id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$",
    );
    await db.exec(sql);
    const userId = "11111111-1111-4111-8111-111111111111";
    await db.query("insert into auth.users (id) values ($1)", [userId]);
    const profile = await db.query<{ id: string }>(
      "insert into profiles (supabase_user_id, display_name) values ($1, 'A') returning id",
      [userId],
    );
    const category = await db.query<{ id: string }>(
      "insert into categories (profile_id, name, kind) values ($1, 'Food', 'expense') returning id",
      [profile.rows[0].id],
    );
    await db.query(
      "insert into transactions (profile_id, category_id, kind, amount, currency, occurred_on) values ($1, $2, 'expense', 12.34, 'INR', '2026-10-21')",
      [profile.rows[0].id, category.rows[0].id],
    );
    await db.query("delete from profiles where id = $1", [profile.rows[0].id]);
    const remaining = await db.query<{ count: string }>(
      "select (select count(*) from categories) + (select count(*) from transactions) as count",
    );
    assert.equal(Number(remaining.rows[0].count), 0);
  } finally {
    await db.close();
  }
});

test("deleting a category referenced by a transaction fails", async () => {
  const db = new PGlite();
  try {
    const sql = (await readFile(migration, "utf8")).replaceAll(
      "--> statement-breakpoint",
      "",
    );
    await db.exec(
      "create role authenticated; create schema auth; create table auth.users (id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$",
    );
    await db.exec(sql);
    const userId = "11111111-1111-4111-8111-111111111111";
    await db.query("insert into auth.users (id) values ($1)", [userId]);
    const profile = await db.query<{ id: string }>(
      "insert into profiles (supabase_user_id, display_name) values ($1, 'A') returning id",
      [userId],
    );
    const category = await db.query<{ id: string }>(
      "insert into categories (profile_id, name, kind) values ($1, 'Food', 'expense') returning id",
      [profile.rows[0].id],
    );
    await db.query(
      "insert into transactions (profile_id, category_id, kind, amount, currency, occurred_on) values ($1, $2, 'expense', 12.34, 'INR', '2026-10-21')",
      [profile.rows[0].id, category.rows[0].id],
    );
    await assert.rejects(
      db.query("delete from categories where id = $1", [category.rows[0].id]),
    );
  } finally {
    await db.close();
  }
});

test("querying transactions by kind returns only matching rows", async () => {
  const db = new PGlite();
  try {
    const sql = (await readFile(migration, "utf8")).replaceAll(
      "--> statement-breakpoint",
      "",
    );
    await db.exec(
      "create role authenticated; create schema auth; create table auth.users (id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$",
    );
    await db.exec(sql);
    const userId = "11111111-1111-4111-8111-111111111111";
    await db.query("insert into auth.users (id) values ($1)", [userId]);
    const profile = await db.query<{ id: string }>(
      "insert into profiles (supabase_user_id, display_name) values ($1, 'A') returning id",
      [userId],
    );
    const expenseCategory = await db.query<{ id: string }>(
      "insert into categories (profile_id, name, kind) values ($1, 'Food', 'expense') returning id",
      [profile.rows[0].id],
    );
    const incomeCategory = await db.query<{ id: string }>(
      "insert into categories (profile_id, name, kind) values ($1, 'Salary', 'income') returning id",
      [profile.rows[0].id],
    );
    await db.query(
      "insert into transactions (profile_id, category_id, kind, amount, currency, occurred_on) values ($1, $2, 'expense', 12.34, 'INR', '2026-10-21')",
      [profile.rows[0].id, expenseCategory.rows[0].id],
    );
    await db.query(
      "insert into transactions (profile_id, category_id, kind, amount, currency, occurred_on) values ($1, $2, 'income', 500.00, 'INR', '2026-10-21')",
      [profile.rows[0].id, incomeCategory.rows[0].id],
    );
    const expenses = await db.query<{ kind: string }>(
      "select kind from transactions where profile_id = $1 and kind = 'expense'",
      [profile.rows[0].id],
    );
    assert.equal(expenses.rows.length, 1);
    assert.equal(expenses.rows[0].kind, "expense");
    const incomes = await db.query<{ kind: string }>(
      "select kind from transactions where profile_id = $1 and kind = 'income'",
      [profile.rows[0].id],
    );
    assert.equal(incomes.rows.length, 1);
    assert.equal(incomes.rows[0].kind, "income");
  } finally {
    await db.close();
  }
});

test("querying transactions by category returns only that category's rows", async () => {
  const db = new PGlite();
  try {
    const sql = (await readFile(migration, "utf8")).replaceAll(
      "--> statement-breakpoint",
      "",
    );
    await db.exec(
      "create role authenticated; create schema auth; create table auth.users (id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$",
    );
    await db.exec(sql);
    const userId = "11111111-1111-4111-8111-111111111111";
    await db.query("insert into auth.users (id) values ($1)", [userId]);
    const profile = await db.query<{ id: string }>(
      "insert into profiles (supabase_user_id, display_name) values ($1, 'A') returning id",
      [userId],
    );
    const foodCategory = await db.query<{ id: string }>(
      "insert into categories (profile_id, name, kind) values ($1, 'Food', 'expense') returning id",
      [profile.rows[0].id],
    );
    const transportCategory = await db.query<{ id: string }>(
      "insert into categories (profile_id, name, kind) values ($1, 'Transport', 'expense') returning id",
      [profile.rows[0].id],
    );
    await db.query(
      "insert into transactions (profile_id, category_id, kind, amount, currency, occurred_on) values ($1, $2, 'expense', 12.34, 'INR', '2026-10-21')",
      [profile.rows[0].id, foodCategory.rows[0].id],
    );
    await db.query(
      "insert into transactions (profile_id, category_id, kind, amount, currency, occurred_on) values ($1, $2, 'expense', 45.00, 'INR', '2026-10-21')",
      [profile.rows[0].id, transportCategory.rows[0].id],
    );
    const foodTransactions = await db.query<{ category_id: string }>(
      "select category_id from transactions where profile_id = $1 and category_id = $2",
      [profile.rows[0].id, foodCategory.rows[0].id],
    );
    assert.equal(foodTransactions.rows.length, 1);
    assert.equal(foodTransactions.rows[0].category_id, foodCategory.rows[0].id);
  } finally {
    await db.close();
  }
});
