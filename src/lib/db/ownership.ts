import { and, eq } from "drizzle-orm";
import { categories, profiles } from "./schema";
import type { getDatabase } from "./index";

export const defaultCategories = [
  ["Food", "expense", "utensils"],
  ["Transport", "expense", "car-front"],
  ["Housing", "expense", "house"],
  ["Shopping", "expense", "shopping-bag"],
  ["Health", "expense", "heart-pulse"],
  ["Education", "expense", "graduation-cap"],
  ["Entertainment", "expense", "clapperboard"],
  ["Bills", "expense", "receipt"],
  ["Other", "expense", "circle-help"],
  ["Salary", "income", "briefcase-business"],
  ["Freelance", "income", "laptop"],
  ["Business", "income", "building-2"],
  ["Interest", "income", "percent"],
  ["Gifts", "income", "gift"],
  ["Other", "income", "circle-help"],
] as const;

type Database = ReturnType<typeof getDatabase>;

export async function resolveProfile(
  db: Database,
  verifiedAuthUser: { id: string; name: string },
) {
  return db.transaction(async (tx) => {
    const [insertedProfile] = await tx
      .insert(profiles)
      .values({
        supabaseUserId: verifiedAuthUser.id,
        displayName: verifiedAuthUser.name || "Nivora member",
      })
      .onConflictDoNothing({ target: profiles.supabaseUserId })
      .returning();

    const [profile] = insertedProfile
      ? [insertedProfile]
      : await tx
          .select()
          .from(profiles)
          .where(eq(profiles.supabaseUserId, verifiedAuthUser.id))
          .limit(1);

    if (!profile)
      throw new Error("Unable to resolve the authenticated profile.");

    await tx
      .insert(categories)
      .values(
        defaultCategories.map(([name, kind, icon]) => ({
          profileId: profile.id,
          name,
          kind,
          icon,
        })),
      )
      .onConflictDoNothing({
        target: [categories.profileId, categories.name, categories.kind],
      });

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
