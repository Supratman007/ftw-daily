import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where Supabase's password-reset email (and any future magic-link
 * email) sends the customer after they click the link. Exchanges the
 * one-time `code` for a real session -- stored in cookies via
 * createSupabaseServerClient -- then hands off to whatever page the
 * flow that started this actually needs next.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
