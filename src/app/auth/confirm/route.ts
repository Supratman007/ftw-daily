import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where password-reset and staff-invite emails send people, via a
 * `token_hash` + `type` link (set up in the Supabase email templates) --
 * NOT the `?code=` PKCE style. That distinction matters: a `code` link
 * only exchanges successfully in the same browser that started the
 * flow, because its verifier lives in a cookie there -- but these
 * emails are server-issued (resetPasswordForEmail / inviteUserByEmail
 * run in a Server Action, no browser involved) and routinely get opened
 * on a different device than the one used to request them. verifyOtp
 * has no such requirement, so it works cross-device/cross-browser,
 * which is what people actually do with email links.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/forgot-password?error=${encodeURIComponent(
      "That reset link expired or was already used -- please request a new one."
    )}`
  );
}
