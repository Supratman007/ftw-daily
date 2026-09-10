import "server-only";

const TRANSLATE_ENDPOINT = "https://translation.googleapis.com/language/translate/v2";

/**
 * Machine-translates a batch of short/medium strings into Indonesian
 * via Google Cloud Translation's Basic (v2) API, using the API key in
 * the GOOGLE_TRANSLATE_API_KEY environment variable (set directly in
 * Vercel's project settings, same as every other secret this app
 * uses -- never checked into the repo or passed through chat).
 *
 * Empty strings pass straight through as empty strings rather than
 * being sent to the API. Throws on any failure (missing key, network
 * error, bad response) -- callers decide what "translation didn't
 * work this time" should mean for them; here that's always "don't
 * block saving the English content, just leave the Indonesian draft
 * as it was and let the admin retry."
 */
export async function translateToIndonesian(texts: string[]): Promise<string[]> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_TRANSLATE_API_KEY is not set");
  }

  const indices: number[] = [];
  const toTranslate: string[] = [];
  texts.forEach((t, i) => {
    if (t) {
      indices.push(i);
      toTranslate.push(t);
    }
  });

  const result = texts.map(() => "");
  if (toTranslate.length === 0) {
    return result;
  }

  const response = await fetch(`${TRANSLATE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: toTranslate, target: "id", format: "text" }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Google Translate request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const json = (await response.json()) as {
    data?: { translations?: Array<{ translatedText: string }> };
  };
  const translations = json.data?.translations ?? [];
  if (translations.length !== toTranslate.length) {
    throw new Error("Google Translate returned an unexpected number of results.");
  }

  indices.forEach((originalIndex, i) => {
    result[originalIndex] = translations[i].translatedText;
  });
  return result;
}
