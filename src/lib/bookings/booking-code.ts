/** Matches the format shown in the approved prototype's Confirmation
 * screen: "ALT-" followed by 6 random uppercase letters/digits. */
export function generateBookingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I -- easy to misread
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ALT-${code}`;
}
