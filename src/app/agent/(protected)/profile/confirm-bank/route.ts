import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/agents/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where the "Confirm bank account change" email link points. Requires
 * the agent to be logged in -- often *not* still true here, since
 * opening a mail app's link routinely lands in a different browser (or
 * in-app webview) than the one the dashboard session lives in. Rather
 * than just bouncing to /agent/login and losing the one-time token,
 * this passes the full request URL (token included) as `next`, so
 * agentLoginAction sends them straight back here to finish once
 * they've signed in again. The RPC itself checks the token matches
 * this agent's id and hasn't expired (24h), so this route just relays
 * whichever outcome it reports.
 */
export async function GET(request: NextRequest) {
  const { origin, searchParams, pathname, search } = new URL(request.url);
  await requireAgent(`${pathname}${search}`);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      `${origin}/agent/profile?error=${encodeURIComponent("That link is missing its confirmation code.")}`
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: confirmed, error } = await supabase.rpc("agent_confirm_bank_change", {
    p_token: token,
  });

  if (error || !confirmed) {
    return NextResponse.redirect(
      `${origin}/agent/profile?error=${encodeURIComponent(
        "That confirmation link has expired or was already used -- please submit the bank account change again."
      )}`
    );
  }

  return NextResponse.redirect(`${origin}/agent/profile?bank_confirmed=1`);
}
