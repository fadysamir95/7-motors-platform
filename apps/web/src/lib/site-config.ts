/**
 * Public contact details. Intentionally empty by default: the footer hides any
 * value that is not configured, so no placeholder contact data is ever shown.
 * Set these in apps/web/.env.local when the real details are available.
 */
const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

export const siteConfig = {
  phone: clean(process.env.NEXT_PUBLIC_CONTACT_PHONE),
  email: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  address: clean(process.env.NEXT_PUBLIC_CONTACT_ADDRESS),
};
