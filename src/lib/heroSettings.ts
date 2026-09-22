import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locales";

export interface HeroSettingsRow {
  hero_image_url: string | null;
  hero_badge_en: string | null;
  hero_badge_id: string | null;
  hero_headline_en: string | null;
  hero_headline_id: string | null;
  hero_subheadline_en: string | null;
  hero_subheadline_id: string | null;
}

export interface HeroContent {
  badge: string;
  headline: string;
  subheadline: string;
  imageUrl: string | null;
}

/**
 * The homepage hero's admin-editable overrides (migration
 * 0048_hero_settings.sql), cached per request with React's cache() --
 * same pattern as getUsdToIdrRate() in lib/exchangeRate.ts. Falls back
 * to null (never throws) so a settings-table hiccup shows the default
 * hero instead of breaking the homepage.
 */
export const getHeroSettings = cache(async (): Promise<HeroSettingsRow | null> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("app_settings")
      .select(
        "hero_image_url, hero_badge_en, hero_badge_id, hero_headline_en, hero_headline_id, hero_subheadline_en, hero_subheadline_id"
      )
      .eq("id", true)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
});

/**
 * Merges the admin-set hero override (if any, per field) with the
 * built-in dictionary copy -- an admin can customize just the photo
 * and leave the text alone, or override one language's headline and
 * leave the other on the default, field by field. An empty/whitespace
 * override (someone cleared a field and saved) falls back to the
 * default too, same as never having set it, rather than showing a
 * blank hero.
 */
export async function getHeroContent(locale: Locale): Promise<HeroContent> {
  const dict = getDictionary(locale).home;
  const settings = await getHeroSettings();
  const badgeOverride = locale === "id" ? settings?.hero_badge_id : settings?.hero_badge_en;
  const headlineOverride = locale === "id" ? settings?.hero_headline_id : settings?.hero_headline_en;
  const subheadlineOverride =
    locale === "id" ? settings?.hero_subheadline_id : settings?.hero_subheadline_en;

  return {
    badge: badgeOverride?.trim() || dict.heroBadge,
    headline: headlineOverride?.trim() || dict.heroHeadline,
    subheadline: subheadlineOverride?.trim() || dict.heroSubheadline,
    imageUrl: settings?.hero_image_url?.trim() || null,
  };
}
