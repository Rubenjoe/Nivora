import { z } from "zod";

export const transactionInput = z.object({
  kind: z.enum(["income", "expense"]),
  amount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,4})?$/)
    .refine((value) => Number(value) > 0, "Amount must be greater than zero."),
  categoryId: z.string().uuid(),
  occurredOn: z.iso.date(),
  merchant: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export const transactionQuery = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    kind: z.enum(["income", "expense"]).optional(),
    categoryId: z.string().uuid().optional(),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    path: ["to"],
    message: "The end date must be on or after the start date.",
  });

export const monthStartDate = z.iso
  .date()
  .refine((value) => value.endsWith("-01"), {
    message: "Choose the first day of a valid month.",
  });
