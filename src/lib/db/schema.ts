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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const transactionKind = pgEnum("transaction_kind", [
  "income",
  "expense",
]);
export const interfaceMode = pgEnum("interface_mode", ["simple", "pro"]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    appwriteUserId: varchar("appwrite_user_id", { length: 128 })
      .notNull()
      .unique(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    timezone: varchar("timezone", { length: 64 })
      .notNull()
      .default("Asia/Kolkata"),
    mode: interfaceMode("mode").notNull().default("simple"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("profiles_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

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
    unique("categories_profile_id_id_unique").on(table.profileId, table.id),
    unique("categories_profile_name_kind_unique").on(
      table.profileId,
      table.name,
      table.kind,
    ),
    index("categories_profile_kind_idx").on(table.profileId, table.kind),
  ],
);

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
      columns: [table.profileId, table.categoryId],
      foreignColumns: [categories.profileId, categories.id],
      name: "transactions_profile_category_fk",
    }).onDelete("restrict"),
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
  ],
);
