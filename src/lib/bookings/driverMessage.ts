/**
 * A pre-filled, no-recipient wa.me link -- opening it drops whoever
 * clicks it straight into WhatsApp's own "choose who to send this to"
 * screen, so they can pick the driver (or a driver group chat) from
 * their own contacts. There's no driver-contacts feature in this app,
 * so this is deliberately the whole mechanism: it never needs one.
 * Shared by the admin booking detail page and /admin/pickups -- same
 * message shape either way, so a driver gets the same format
 * regardless of which screen staff sent it from.
 */
export function buildDriverMessageLink(params: {
  productTitle: string | null | undefined;
  bookingCode: string;
  pickupDatetime: string;
  carLabel: string | null;
  pickupArea: string;
  dropoffArea: string | null;
  passengerName: string | null;
  customerName?: string | null;
  flightDetails: string | null;
  pickupWhatsappNumber: string | null;
}): string {
  const lines = [
    "New pickup:",
    `Trip: ${params.productTitle ?? "Trip"}`,
    `Booking: ${params.bookingCode}`,
    `Pickup: ${new Date(params.pickupDatetime).toLocaleString()}`,
    params.carLabel ? `Car: ${params.carLabel}` : null,
    `From: ${params.pickupArea}`,
    params.dropoffArea ? `To: ${params.dropoffArea}` : null,
    `Passenger: ${params.passengerName ?? params.customerName ?? "—"}`,
    params.flightDetails ? `Flight: ${params.flightDetails}` : null,
    params.pickupWhatsappNumber ? `Customer WhatsApp: ${params.pickupWhatsappNumber}` : null,
  ].filter((line): line is string => Boolean(line));
  return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
}
