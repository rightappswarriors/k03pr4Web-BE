import { z } from "zod";
import { cleanString } from "../common/validation";

const optionalText = z
  .string()
  .optional()
  .nullable()
  .transform((value) => (value ? cleanString(value) : null));

export const registerSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(6),
  full_name: z.string().min(1).transform(cleanString),
  contact_number: z.string().min(1).transform(cleanString),
  gender: optionalText,
  date_of_birth: optionalText,
  role: z.string().optional().default("CUSTOMER").transform(cleanString),
  store_details: z.string().optional(),
  company_details: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  otp: z.string().regex(/^\d{6}$/),
});

export const resendOtpSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
});

export const addCartSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive().default(1),
  branch_id: z.coerce.number().int().positive().optional().nullable(),
});

export const updateCartSchema = z.object({
  quantity: z.coerce.number().int(),
});

export const addressSchema = z.object({
  full_name: z.string().min(1).transform(cleanString),
  phone: z.string().min(1).transform(cleanString),
  region: z.string().min(1).transform(cleanString),
  province: z.string().min(1).transform(cleanString),
  city: z.string().min(1).transform(cleanString),
  barangay: z.string().min(1).transform(cleanString),
  street_address: z.string().min(1).transform(cleanString),
  postal_code: z.string().optional().default("").transform(cleanString),
  label: z.string().optional().default("Home").transform(cleanString),
  is_default: z.coerce.boolean().optional().default(false),
  lat: z.coerce.number().optional().nullable(),
  lng: z.coerce.number().optional().nullable(),
});

export const checkoutSchema = z.object({
  outlet_id: z.coerce.number().int().positive(),
  order_type: z.string().optional().default("PICKUP").transform(cleanString),
  delivery_address_id: z.coerce.number().int().positive().optional().nullable(),
  payment_method: z.string().optional().default("COD").transform(cleanString),
  customer_note: z.string().optional().default("").transform(cleanString),
  courier_ids: z.array(z.coerce.number().int().positive()).optional().default([]),
});

export const profileSchema = z.object({
  full_name: z.string().optional().transform((value) => (value ? cleanString(value) : value)),
  contact_number: z.string().optional().transform((value) => (value ? cleanString(value) : value)),
  gender: optionalText,
  date_of_birth: optionalText,
});

export const switchOutletSchema = z.object({
  outlet_id: z.coerce.number().int().positive(),
});
