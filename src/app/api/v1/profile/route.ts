import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { profiles } from "@/lib/db/schema";
import { requireFinanceUser } from "@/lib/finance/auth";
import {
  handleFinanceRouteError,
  unauthorized,
} from "@/lib/finance/api-errors";
import { hasTrustedOrigin } from "@/lib/security/origin";
import { createClient } from "@/lib/supabase/server";
import { deleteAuthUser } from "@/lib/supabase/admin";
import {
  canChangeProfileCurrency,
  profileHasFinancialRecords,
} from "@/lib/finance/currency-change";

const profilePatchSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  dateFormat: z.string().trim().min(2).max(32).optional(),
  appearance: z.enum(["system", "light", "dark"]).optional(),
  mode: z.enum(["simple", "pro"]).optional(),
  budgetAlertsEnabled: z.boolean().optional(),
  goalAlertsEnabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    return NextResponse.json({ profile: current.profile });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}

export async function PATCH(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const parsed = profilePatchSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
    const updated = await current.db.transaction(async (tx) => {
      if (
        parsed.data.currency &&
        parsed.data.currency !== current.profile.currency
      ) {
        const hasFinancialRecords = await profileHasFinancialRecords(
          tx,
          current.profile.id,
        );
        if (
          !canChangeProfileCurrency(
            current.profile.currency,
            parsed.data.currency,
            hasFinancialRecords,
          )
        ) {
          return { conflict: true as const };
        }
      }
      const [row] = await tx
        .update(profiles)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(profiles.id, current.profile.id))
        .returning();
      return { conflict: false as const, profile: row };
    });

    if (updated.conflict) {
      return NextResponse.json(
        {
          error:
            "Preferred currency cannot be changed while financial records exist. Nivora does not convert or re-denominate saved amounts.",
          code: "currency_change_requires_empty_financial_data",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ profile: updated.profile });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}

const deleteAccountSchema = z.object({ confirm: z.literal("DELETE") });

/**
 * Permanently deletes the signed-in user's data (profile rows cascade to
 * categories, transactions, budgets, goals and recurring schedules), then
 * removes the login itself when a service-role key is configured.
 */
export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const current = await requireFinanceUser();
    if (!current) return unauthorized();
    const parsed = deleteAccountSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      return NextResponse.json(
        { error: "Type DELETE to confirm account deletion." },
        { status: 400 },
      );

    await current.db
      .delete(profiles)
      .where(eq(profiles.id, current.profile.id));

    const authResult = await deleteAuthUser(current.user.id);
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // The session cookie is cleared client-side as well; ignore here.
    }
    return NextResponse.json({
      ok: true,
      authUserRemoved: authResult === "removed",
    });
  } catch (cause) {
    return handleFinanceRouteError(cause);
  }
}
