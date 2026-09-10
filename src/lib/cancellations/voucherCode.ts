/** Same shape as generateBookingCode() (booking-code.ts) -- "GIFT-"
 * followed by 6 random uppercase letters/digits, no 0/O/1/I so it's
 * easy to read back over the phone when a recipient redeems it. */
export function generateVoucherCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `GIFT-${code}`;
}
