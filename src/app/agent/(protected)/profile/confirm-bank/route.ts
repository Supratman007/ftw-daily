import { NextRequest, NextResponse } from "next/server";
import { requireAgent } from "@/lib/agents/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where the "Confirm bank account change" email link points. Requires
 * the agent to already be logged in (requireAgent bounces to
 * /agent/login otherwise, same as every other protected agent page) --
 * an agent clicking this from their own inbox is normally still signed
 * in from the session they made the change request in. The RPC itself
 * checks the token matches this agent's id and hasn't expired (24h),
 * so this route just relays whichever outcome it reports.
 */
export async function GET(request: NextRequest) {
  await requireAgent();
  const { origin, searchParams } = new URL(request.url);
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
