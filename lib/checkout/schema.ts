import { z } from "zod";
import type { Address } from "@/lib/db/types";

/**
 * One definition of a shipping/billing address, shared by the checkout and the account profile, so
 * an address that passes at checkout is the same shape the account page can save.
 */
export const addressSchema = z.object({
  firstName: z.string().trim().min(1, "Enter a first name.").max(60),
  lastName: z.string().trim().max(60).optional().default(""),
  address1: z.string().trim().min(5, "Enter the house / street address.").max(200),
  address2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, "Enter a city.").max(80),
  state: z.string().trim().min(2, "Select a state.").max(80),
  postalCode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code."),
  country: z.string().trim().max(60).optional().default("India"),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
  email: z.union([z.email("Enter a valid e-mail address."), z.literal("")]).optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

/** Validated input → the stored Address shape. */
export function toAddress(input: AddressInput): Address {
  return {
    firstName: input.firstName,
    lastName: input.lastName || "",
    address1: input.address1,
    address2: input.address2 || undefined,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    country: input.country || "India",
    phone: input.phone,
    email: input.email || undefined,
  };
}

export const cartItemsSchema = z
  .array(
    z.object({
      productId: z.string().min(1).max(200),
      qty: z.number().int().min(1).max(20),
      size: z.string().max(60).optional(),
      color: z.string().max(60).optional(),
    })
  )
  .min(1, "Your cart is empty.")
  .max(40, "Too many items in one order. Please split the order or contact us.");

export type CartItemInput = z.infer<typeof cartItemsSchema>[number];

export const paymentMethodSchema = z.enum(["razorpay", "cod"]);
export type CheckoutPaymentMethod = z.infer<typeof paymentMethodSchema>;
