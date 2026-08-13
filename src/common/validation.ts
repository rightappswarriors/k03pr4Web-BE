import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

export const cleanString = (value: string) =>
  value.trim().replace(/[<>]/g, "");

export const cleanOptionalString = (value: unknown) =>
  typeof value === "string" && value.trim() ? cleanString(value) : null;

export function parseBody<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (parsed.success) return parsed.data;

  throw new BadRequestException({
    error: "Invalid request payload.",
    fields: parsed.error.flatten().fieldErrors,
  });
}

export function parsePositiveId(value: string | number, label = "id") {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestException({ error: `Valid ${label} is required.` });
  }
  return id;
}
