import { and, eq } from "drizzle-orm";
import { categories, profiles } from "./schema";
import type { getDatabase } from "./index";

const defaults = [
  ["Food & dining", "expense", "utensils"],
  ["Transport", "expense", "car-front"],
  ["Home", "expense", "house"],
  ["Shopping", "expense", "shopping-bag"],
  ["Health", "expense", "heart-pulse"],
  ["Other", "expense", "circle-help"],
  ["Salary", "income", "briefcase-business"],
  ["Other income", "income", "circle-help"],
] as const;

type Database = ReturnType<typeof getDatabase>;

export async function resolveProfile(
  db: Database,
  identity: { id: string; name: string },
) {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .insert(profiles)
      .values({
        appwriteUserId: identity.id,
        displayName: identity.name || "Nivora member",
      })
      .onConflictDoUpdate({
        target: profiles.appwriteUserId,
        set: {
          displayName: identity.name || "Nivora member",
          updatedAt: new Date(),
        },
      })
      .returning();
    for (const [name, kind, icon] of defaults) {
      await tx
        .insert(categories)
        .values({ profileId: profile.id, name, kind, icon })
        .onConflictDoNothing();
    }
    return profile;
  });
}

export async function categoryOwnedBy(
  db: Database,
  profileId: string,
  categoryId: string,
  kind: "income" | "expense",
) {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.profileId, profileId),
        eq(categories.kind, kind),
      ),
    )
    .limit(1);
  return category ?? null;
}
