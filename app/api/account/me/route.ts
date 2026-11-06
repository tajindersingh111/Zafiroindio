import { NextResponse } from "next/server";
import { z } from "zod";
import { customerProfileView, requireCustomer, updateCustomerProfile } from "@/lib/auth/customer";
import { addressSchema, toAddress } from "@/lib/checkout/schema";

export const dynamic = "force-dynamic";

/** The signed-in shopper, or 401. The storefront uses this to decide what the header shows. */
export async function GET(request: Request) {
  const auth = await requireCustomer(request);
  if (auth.error) return auth.error;
  return NextResponse.json({ customer: customerProfileView(auth.customer) });
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  email: z.union([z.email("Enter a valid e-mail address."), z.literal("")]).optional(),
  shipping: addressSchema.optional(),
  billing: addressSchema.optional(),
});

/**
 * Shopper edits their own profile / saved address.
 *
 * The phone is not editable here: it is what the OTP proved, so changing it would mean changing
 * identity without re-verification.
 */
export async function PATCH(request: Request) {
  const auth = await requireCustomer(request);
  if (auth.error) return auth.error;

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Please check the details you entered." }, { status: 400 });
  }

  const { shipping, billing, ...rest } = parsed.data;
  const updated = await updateCustomerProfile(auth.customer, {
    ...rest,
    shipping: shipping ? toAddress(shipping) : undefined,
    billing: billing ? toAddress(billing) : undefined,
  });
  return NextResponse.json({ customer: customerProfileView(updated) });
}
