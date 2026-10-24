import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  date,
  timestamp,
  index,
  unique,
  foreignKey,
  check,
  pgPolicy,
  boolean,
  integer,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { authUid, authUsers, authenticatedRole } from "drizzle-orm/supabase";

export const transactionKind = pgEnum("transaction_kind", [
  "income",
  "expense",
]);
export const interfaceMode = pgEnum("interface_mode", ["simple", "pro"]);
export const budgetStatus = pgEnum("budget_status", ["active", "archived"]);
export const goalStatus = pgEnum("goal_status", [
  "active",
  "paused",
  "completed",
  "archived",
]);
export const recurrenceFrequency = pgEnum("recurrence_frequency", [
  "weekly",
  "monthly",
  "yearly",
]);
export const recurrenceStatus = pgEnum("recurrence_status", [
  "active",
  "paused",
  "cancelled",
]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    supabaseUserId: uuid("supabase_user_id")
      .notNull()
      .unique()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    timezone: varchar("timezone", { length: 64 })
      .notNull()
      .default("Asia/Kolkata"),
    mode: interfaceMode("mode").notNull().default("simple"),
    dateFormat: varchar("date_format", { length: 32 })
      .notNull()
      .default("en-IN"),
    appearance: varchar("appearance", { length: 16 })
      .notNull()
      .default("system"),
    budgetAlertsEnabled: boolean("budget_alerts_enabled")
      .notNull()
      .default(true),
    goalAlertsEnabled: boolean("goal_alerts_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("profiles_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    pgPolicy("profiles_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${table.supabaseUserId} = ${authUid}`,
    }),
    pgPolicy("profiles_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${table.supabaseUserId} = ${authUid}`,
    }),
    pgPolicy("profiles_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${table.supabaseUserId} = ${authUid}`,
      withCheck: sql`${table.supabaseUserId} = ${authUid}`,
    }),
    pgPolicy("profiles_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${table.supabaseUserId} = ${authUid}`,
    }),
  ],
).enableRLS();

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    kind: transactionKind("kind").notNull(),
    icon: varchar("icon", { length: 48 }).notNull().default("circle-help"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("categories_profile_id_id_kind_unique").on(
      table.profileId,
      table.id,
      table.kind,
    ),
    unique("categories_profile_name_kind_unique").on(
      table.profileId,
      table.name,
      table.kind,
    ),
    index("categories_profile_kind_idx").on(table.profileId, table.kind),
    pgPolicy("categories_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from ${profiles} where ${profiles.id} = ${table.profileId} and ${profiles.supabaseUserId} = ${authUid})`,
    }),
    pgPolicy("categories_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`exists (select 1 from ${profiles} where ${profiles.id} = ${table.profileId} and ${profiles.supabaseUserId} = ${authUid})`,
    }),
    pgPolicy("categories_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`exists (select 1 from ${profiles} where ${profiles.id} = ${table.profileId} and ${profiles.supabaseUserId} = ${authUid})`,
      withCheck: sql`exists (select 1 from ${profiles} where ${profiles.id} = ${table.profileId} and ${profiles.supabaseUserId} = ${authUid})`,
    }),
    pgPolicy("categories_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`exists (select 1 from ${profiles} where ${profiles.id} = ${table.profileId} and ${profiles.supabaseUserId} = ${authUid})`,
    }),
  ],
).enableRLS();

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull(),
    kind: transactionKind("kind").notNull(),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    merchant: varchar("merchant", { length: 120 }),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.profileId, table.categoryId, table.kind],
      foreignColumns: [categories.profileId, categories.id, categories.kind],
      name: "transactions_profile_category_fk",
    }).onDelete("no action"),
    check("transactions_amount_positive", sql`${table.amount} > 0`),
    check("transactions_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
    index("transactions_profile_date_idx").on(
      table.profileId,
      table.occurredOn,
    ),
    index("transactions_profile_kind_date_idx").on(
      table.profileId,
      table.kind,
      table.occurredOn,
    ),
    pgPolicy("transactions_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`exists (select 1 from ${profiles} where ${profiles.id} = ${table.profileId} and ${profiles.supabaseUserId} = ${authUid})`,
    }),
    pgPolicy("transactions_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`exists (select 1 from ${profiles} where ${profiles.id} = ${table.profileId} and ${profiles.supabaseUserId} = ${authUid})`,
    }),
    pgPolicy("transactions_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`exists (select 1 from ${profiles} where ${profiles.id} = ${table.profileId} and ${profiles.supabaseUserId} = ${authUid})`,
      withCheck: sql`exists (select 1 from ${profiles} where ${profiles.id} = ${table.profileId} and ${profiles.supabaseUserId} = ${authUid})`,
    }),
    pgPolicy("transactions_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`exists (select 1 from ${profiles} where ${profiles.id} = ${table.profileId} and ${profiles.supabaseUserId} = ${authUid})`,
    }),
  ],
).enableRLS();

const profileOwnerUsing = (profileIdColumn: AnyPgColumn) =>
  sql`exists (select 1 from ${profiles} where ${profiles.id} = ${profileIdColumn} and ${profiles.supabaseUserId} = ${authUid})`;

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    categoryId: uuid("category_id"),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    periodMonth: date("period_month", { mode: "string" }).notNull(),
    warningThresholdPercent: integer("warning_threshold_percent")
      .notNull()
      .default(80),
    status: budgetStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("budgets_amount_positive", sql`${table.amount} > 0`),
    check(
      "budgets_warning_threshold_check",
      sql`${table.warningThresholdPercent} between 1 and 100`,
    ),
    unique("budgets_profile_name_period_unique").on(
      table.profileId,
      table.name,
      table.periodMonth,
    ),
    index("budgets_profile_period_idx").on(table.profileId, table.periodMonth),
    pgPolicy("budgets_select_own", {
      for: "select",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("budgets_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("budgets_update_own", {
      for: "update",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
      withCheck: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("budgets_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
    }),
  ],
).enableRLS();

export const savingsGoals = pgTable(
  "savings_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    targetAmount: numeric("target_amount", {
      precision: 19,
      scale: 4,
    }).notNull(),
    targetDate: date("target_date", { mode: "string" }),
    status: goalStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("savings_goals_target_positive", sql`${table.targetAmount} > 0`),
    unique("savings_goals_profile_name_unique").on(table.profileId, table.name),
    pgPolicy("savings_goals_select_own", {
      for: "select",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("savings_goals_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("savings_goals_update_own", {
      for: "update",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
      withCheck: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("savings_goals_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
    }),
  ],
).enableRLS();

export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => savingsGoals.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    contributedOn: date("contributed_on", { mode: "string" }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("goal_contributions_amount_positive", sql`${table.amount} > 0`),
    index("goal_contributions_goal_idx").on(table.goalId),
    pgPolicy("goal_contributions_select_own", {
      for: "select",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("goal_contributions_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("goal_contributions_update_own", {
      for: "update",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
      withCheck: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("goal_contributions_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
    }),
  ],
).enableRLS();

export const recurringSchedules = pgTable(
  "recurring_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull(),
    kind: transactionKind("kind").notNull(),
    amount: numeric("amount", { precision: 19, scale: 4 }).notNull(),
    merchant: varchar("merchant", { length: 120 }),
    description: text("description"),
    frequency: recurrenceFrequency("frequency").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    nextDueDate: date("next_due_date", { mode: "string" }).notNull(),
    status: recurrenceStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("recurring_schedules_amount_positive", sql`${table.amount} > 0`),
    index("recurring_schedules_profile_due_idx").on(
      table.profileId,
      table.nextDueDate,
    ),
    pgPolicy("recurring_schedules_select_own", {
      for: "select",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("recurring_schedules_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("recurring_schedules_update_own", {
      for: "update",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
      withCheck: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("recurring_schedules_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
    }),
  ],
).enableRLS();

export const recurringOccurrences = pgTable(
  "recurring_occurrences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scheduleId: uuid("schedule_id")
      .notNull()
      .references(() => recurringSchedules.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("recurring_occurrences_schedule_due_unique").on(
      table.scheduleId,
      table.dueDate,
    ),
    pgPolicy("recurring_occurrences_select_own", {
      for: "select",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("recurring_occurrences_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: profileOwnerUsing(table.profileId),
    }),
    pgPolicy("recurring_occurrences_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: profileOwnerUsing(table.profileId),
    }),
  ],
).enableRLS();
