-- Tag more existing "Extension Trip" products (Java, Borneo -- plus two
-- Sumatra ones found along the way) with a `location` the extension-
-- trip filter (isExtensionTripLocation / HomePage.tsx) can match, same
-- pattern as migration 0049 for Bali/Sumba/Komodo/Flores.
--
-- Checked every row against the database first (per the lesson from
-- 0049) -- all 10 below already existed, so this is updates only, no
-- inserts, and no guessed prices: the real adult_price_usd values were
-- already correct in the database (confirmed against the founder's
-- screenshots -- a few were off by a little in the screenshot read,
-- e.g. Java Overland Tour is actually $1,395, not the ~$1,285 guessed
-- from the small screenshot text).
--
-- Bonus: bukit-lawang-orangutan-trek and sumatra-orangutans-elephants-
-- tour already exist too, even though no Sumatra screenshot has been
-- sent yet -- tagging them now gives Sumatra real coverage already.
--
-- indonesia-wildlife-heritage-and-leisure-trip is the 16-day trip that
-- appears on both the Borneo and Java destination pages -- its blurb
-- mentions a third "ecosystem" beyond Borneo and Java that wasn't
-- clearly readable from the screenshot, so only the two confirmed
-- destinations are set here. Broaden `location` from /admin/products
-- if there's a third leg (e.g. Bali/Komodo) worth surfacing too.
--
-- indonesia-adventure-bromo-komodo-bali-discovery and java-bali-trip
-- were already tagged correctly in migration 0049 -- not touched here.
--
-- Run in the Supabase SQL Editor, same as every earlier migration.

update products set location = 'Bukit Lawang, Sumatra' where slug = 'bukit-lawang-orangutan-trek';
update products set location = 'Sumatra' where slug = 'sumatra-orangutans-elephants-tour';
update products set location = 'Borneo & Java' where slug = 'indonesia-wildlife-heritage-and-leisure-trip';
update products set location = 'Java' where slug = 'java-highlights-tour';
update products set location = 'Java' where slug = 'java-overland-tour';
update products set location = 'Java' where slug = 'bromo-ijen-tour';
update products set location = 'Yogyakarta, Java' where slug = 'yogyakarta-tour';
update products set location = 'Tanjung Puting, Borneo' where slug = 'tanjung-puting-orangutan-tour';
update products set location = 'Tanjung Puting, Borneo' where slug = 'tanjung-puting-orangutan-tour-4-days';
update products set location = 'Tanjung Puting, Borneo' where slug = 'tanjung-puting-orangutans-dayak-village-5-day-tour';
