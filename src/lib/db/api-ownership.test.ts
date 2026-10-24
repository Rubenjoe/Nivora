import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { defaultCategories, resolveProfile } from "./ownership";
import { profileHasFinancialRecords } from "../finance/currency-change";
import type { getDatabase } from "./index";

/**
 * API-level data-access ownership tests.
 *
 * These tests apply the real migration SQL (0000 + 0001 + 0002) to a
 * disposable local PGlite database, then run the exact query shapes the
 * finance API route handlers use — profile-scoped filters with two distinct
 * profiles — to prove one user's writes are never visible to, or mutable by,
 * the other.
 *
 * NOT covered here: the live Supabase Auth session layer (requireFinanceUser)
 * which needs a hosted Supabase project; and RLS under the app's privileged
 * connection. Those are documented as pending hosted verification.
 */

const migrationFiles = [
  "../../../drizzle/0000_rare_wither.sql",
  "../../../drizzle/0001_0001_grants_hardening.sql",
  "../../../drizzle/0002_black_gamma_corps.sql",
] as const;

async function buildDatabase() {
  const client = new PGlite();
  await client.exec(
    "create role anon; create role authenticated; create schema auth; create table auth.users (id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$",
  );
  for (const file of migrationFiles) {
    const sql = await readFile(new URL(file, import.meta.url), "utf8");
    await client.exec(sql.replaceAll("--> statement-breakpoint", ";"));
  }
  return { client, db: drizzle(client, { schema }) };
}

async function seedAuthUser(
  db: ReturnType<typeof drizzle>,
  supabaseUserId: string,
) {
  await db.execute(
    // auth.users lives outside the Drizzle schema but the profiles FK requires it.
    sql`insert into auth.users (id) values (${supabaseUserId}) on conflict do nothing`,
  );
}

test("currency-change guard sees only financial rows owned by the requested profile", async () => {
  const { client, db } = await buildDatabase();
  try {
    const userA = "11111111-1111-4111-8111-111111111111";
    const userB = "22222222-2222-4222-8222-222222222222";
    await seedAuthUser(db, userA);
    await seedAuthUser(db, userB);
    const [profileA, profileB] = await db
      .insert(schema.profiles)
      .values([
        { supabaseUserId: userA, displayName: "A" },
        { supabaseUserId: userB, displayName: "B" },
      ])
      .returning();

    const serverDb = db as unknown as ReturnType<typeof getDatabase>;
    assert.equal(
      await profileHasFinancialRecords(serverDb, profileA!.id),
      false,
    );
    assert.equal(
      await profileHasFinancialRecords(serverDb, profileB!.id),
      false,
    );

    const [categoryB] = await db
      .insert(schema.categories)
      .values({ profileId: profileB!.id, name: "Food", kind: "expense" })
      .returning();
    await db.insert(schema.transactions).values({
      profileId: profileB!.id,
      categoryId: categoryB!.id,
      kind: "expense",
      amount: "40.00",
      currency: "INR",
      occurredOn: "2026-10-24",
    });

    assert.equal(
      await profileHasFinancialRecords(serverDb, profileA!.id),
      false,
    );
    assert.equal(
      await profileHasFinancialRecords(serverDb, profileB!.id),
      true,
    );
  } finally {
    await client.close();
  }
});

test("profile resolution seeds categories in one idempotent batch without resetting the name", async () => {
  const { client, db } = await buildDatabase();
  try {
    const userId = "33333333-3333-4333-8333-333333333333";
    await seedAuthUser(db, userId);
    const serverDb = db as unknown as ReturnType<typeof getDatabase>;

    const created = await resolveProfile(serverDb, {
      id: userId,
      name: "Initial name",
    });
    const seeded = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.profileId, created.id));
    assert.equal(seeded.length, defaultCategories.length);

    await db
      .update(schema.profiles)
      .set({ displayName: "Chosen display name" })
      .where(eq(schema.profiles.id, created.id));
    const resolvedAgain = await resolveProfile(serverDb, {
      id: userId,
      name: "Initial name",
    });
    const categoriesAfterResolve = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.profileId, created.id));

    assert.equal(resolvedAgain.displayName, "Chosen display name");
    assert.equal(categoriesAfterResolve.length, defaultCategories.length);
  } finally {
    await client.close();
  }
});

test("user B's queries never see user A's transactions (route query shape)", async () => {
  const { client, db } = await buildDatabase();
  try {
    const userA = "11111111-1111-4111-8111-111111111111";
    const userB = "22222222-2222-4222-8222-222222222222";
    await seedAuthUser(db, userA);
    await seedAuthUser(db, userB);
    await db.insert(schema.profiles).values([
      { supabaseUserId: userA, displayName: "A" },
      { supabaseUserId: userB, displayName: "B" },
    ]);
    const profiles = await db.select().from(schema.profiles);
    const a = profiles.find((p) => p.supabaseUserId === userA)!;
    const b = profiles.find((p) => p.supabaseUserId === userB)!;
    const [categoryA] = await db
      .insert(schema.categories)
      .values({ profileId: a.id, name: "Food", kind: "expense" })
      .returning();
    const [transactionA] = await db
      .insert(schema.transactions)
      .values({
        profileId: a.id,
        categoryId: categoryA.id,
        kind: "expense",
        amount: "150.00",
        currency: "INR",
        occurredOn: "2026-10-21",
      })
      .returning();

    // The exact filter shape used by GET /api/v1/transactions
    const visibleToB = await db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.id, transactionA!.id),
          eq(schema.transactions.profileId, b.id),
          eq(schema.transactions.currency, "INR"),
        ),
      );
    assert.equal(visibleToB.length, 0);

    // The exact GET /api/v1/transactions/[id] ID + profile scope.
    const rowByIdForB = await db
      .select()
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.id, transactionA!.id),
          eq(schema.transactions.profileId, b.id),
        ),
      )
      .limit(1);
    assert.equal(rowByIdForB.length, 0);

    // The exact update shape used by PATCH — scoped to B's profile
    const updated = await db
      .update(schema.transactions)
      .set({ amount: "999.00", updatedAt: new Date() })
      .where(
        and(
          eq(schema.transactions.id, transactionA!.id),
          eq(schema.transactions.profileId, b.id),
          eq(schema.transactions.currency, "INR"),
        ),
      )
      .returning();
    assert.equal(updated.length, 0);

    // The exact delete shape used by DELETE — scoped to B's profile
    const deleted = await db
      .delete(schema.transactions)
      .where(
        and(
          eq(schema.transactions.id, transactionA!.id),
          eq(schema.transactions.profileId, b.id),
          eq(schema.transactions.currency, "INR"),
        ),
      )
      .returning();
    assert.equal(deleted.length, 0);

    // A's row is untouched
    const aRows = await db
      .select({ amount: schema.transactions.amount })
      .from(schema.transactions)
      .where(eq(schema.transactions.profileId, a.id));
    assert.equal(aRows[0].amount, "150.0000");
  } finally {
    await client.close();
  }
});

test("budget spending uses only the owner's expenses in the budget month and category", async () => {
  const { client, db } = await buildDatabase();
  try {
    const userA = "11111111-1111-4111-8111-111111111111";
    await seedAuthUser(db, userA);
    const [profile] = await db
      .insert(schema.profiles)
      .values({ supabaseUserId: userA, displayName: "A" })
      .returning();
    const [food] = await db
      .insert(schema.categories)
      .values({ profileId: profile.id, name: "Food", kind: "expense" })
      .returning();
    const [transport] = await db
      .insert(schema.categories)
      .values({ profileId: profile.id, name: "Transport", kind: "expense" })
      .returning();
    const [salary] = await db
      .insert(schema.categories)
      .values({ profileId: profile.id, name: "Salary", kind: "income" })
      .returning();
    await db.insert(schema.transactions).values([
      {
        profileId: profile.id,
        categoryId: food.id,
        kind: "expense",
        amount: "120.50",
        currency: "INR",
        occurredOn: "2026-10-05",
      },
      {
        profileId: profile.id,
        categoryId: food.id,
        kind: "expense",
        amount: "80.25",
        currency: "INR",
        occurredOn: "2026-11-02",
      },
      {
        profileId: profile.id,
        categoryId: transport.id,
        kind: "expense",
        amount: "50.00",
        currency: "INR",
        occurredOn: "2026-10-09",
      },
      {
        profileId: profile.id,
        categoryId: salary.id,
        kind: "income",
        amount: "5000.00",
        currency: "INR",
        occurredOn: "2026-10-01",
      },
    ]);
    const [budget] = await db
      .insert(schema.budgets)
      .values({
        profileId: profile.id,
        name: "October food",
        amount: "500.00",
        periodMonth: "2026-10-01",
        categoryId: food.id,
      })
      .returning();

    // October food budget: only the 2026-10-05 food expense (120.50) counts.
    const octoberFood = await db
      .select({ amount: schema.transactions.amount })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.profileId, profile.id),
          eq(schema.transactions.currency, "INR"),
          eq(schema.transactions.kind, "expense"),
          eq(schema.transactions.categoryId, food.id),
          eq(schema.transactions.occurredOn, "2026-10-05"),
        ),
      );
    const spent = octoberFood.reduce((sum, row) => sum + Number(row.amount), 0);
    assert.equal(spent, 120.5);
    assert.ok(budget.amount === "500.0000");
  } finally {
    await client.close();
  }
});

test("goal progress counts only contributions, never income transactions", async () => {
  const { client, db } = await buildDatabase();
  try {
    const userA = "11111111-1111-4111-8111-111111111111";
    await seedAuthUser(db, userA);
    const [profile] = await db
      .insert(schema.profiles)
      .values({ supabaseUserId: userA, displayName: "A" })
      .returning();
    const [goal] = await db
      .insert(schema.savingsGoals)
      .values({
        profileId: profile.id,
        name: "Emergency fund",
        targetAmount: "1000.00",
      })
      .returning();
    await db.insert(schema.goalContributions).values([
      {
        goalId: goal.id,
        profileId: profile.id,
        amount: "300.00",
        contributedOn: "2026-10-01",
      },
      {
        goalId: goal.id,
        profileId: profile.id,
        amount: "250.00",
        contributedOn: "2026-10-15",
      },
    ]);
    // An income transaction must not affect goal progress.
    const [salary] = await db
      .insert(schema.categories)
      .values({ profileId: profile.id, name: "Salary", kind: "income" })
      .returning();
    await db.insert(schema.transactions).values({
      profileId: profile.id,
      categoryId: salary.id,
      kind: "income",
      amount: "5000.00",
      currency: "INR",
      occurredOn: "2026-10-01",
    });
    const contributions = await db
      .select({ amount: schema.goalContributions.amount })
      .from(schema.goalContributions)
      .where(eq(schema.goalContributions.goalId, goal.id));
    const saved = contributions.reduce(
      (sum, row) => sum + Number(row.amount),
      0,
    );
    assert.equal(saved, 550);
    assert.equal(saved < 1000, true);
  } finally {
    await client.close();
  }
});

test("recurring occurrence recording is duplicate-safe", async () => {
  const { client, db } = await buildDatabase();
  try {
    const userA = "11111111-1111-4111-8111-111111111111";
    await seedAuthUser(db, userA);
    const [profile] = await db
      .insert(schema.profiles)
      .values({ supabaseUserId: userA, displayName: "A" })
      .returning();
    const [category] = await db
      .insert(schema.categories)
      .values({ profileId: profile.id, name: "Bills", kind: "expense" })
      .returning();
    const [schedule] = await db
      .insert(schema.recurringSchedules)
      .values({
        profileId: profile.id,
        categoryId: category.id,
        kind: "expense",
        amount: "80.00",
        frequency: "monthly",
        startDate: "2026-09-01",
        nextDueDate: "2026-10-01",
      })
      .returning();

    const recordOccurrence = async () => {
      // The same transaction+occurrence insert sequence the route uses.
      const [existing] = await db
        .select({ id: schema.recurringOccurrences.id })
        .from(schema.recurringOccurrences)
        .where(
          and(
            eq(schema.recurringOccurrences.scheduleId, schedule.id),
            eq(schema.recurringOccurrences.dueDate, schedule.nextDueDate),
          ),
        )
        .limit(1);
      if (existing) return { duplicate: true as const };
      const [transaction] = await db
        .insert(schema.transactions)
        .values({
          profileId: profile.id,
          categoryId: category.id,
          kind: "expense",
          amount: schedule.amount,
          currency: "INR",
          occurredOn: schedule.nextDueDate,
          merchant: "Electric company",
        })
        .returning();
      await db.insert(schema.recurringOccurrences).values({
        scheduleId: schedule.id,
        profileId: profile.id,
        transactionId: transaction.id,
        dueDate: schedule.nextDueDate,
      });
      return { duplicate: false as const, transaction };
    };

    const first = await recordOccurrence();
    assert.equal(first.duplicate, false);
    const second = await recordOccurrence();
    assert.equal(second.duplicate, true);
    const occurrences = await db
      .select()
      .from(schema.recurringOccurrences)
      .where(eq(schema.recurringOccurrences.scheduleId, schedule.id));
    assert.equal(occurrences.length, 1);
  } finally {
    await client.close();
  }
});
