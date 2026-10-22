-- Tag existing "Extension Trip" products (Bali, Sumba, Komodo, Flores,
-- and a few multi-destination Indonesia trips) so the "Extension Trips"
-- header filter (see extensionDestinations.ts) actually finds them.
--
-- This migration was originally written as an INSERT of 12 "new"
-- products transcribed from adventure-lombok.com screenshots. The
-- founder ran it and got "duplicate key value violates unique
-- constraint products_slug_key" -- it turned out every one of those
-- trips already existed in the products table (under different slugs
-- than guessed from the screenshots), just with location = null. The
-- extension-trip filter only looks at `location` (see
-- isExtensionTripLocation() / HomePage.tsx), so these were real,
-- already-priced, already-photographed products that simply weren't
-- showing up anywhere under that filter. Fixing `location` is the
-- actual fix -- no new rows needed, and no guessed prices either,
-- since the real numbers were already in the database.
--
-- wae-rebo-trek-tour already had location = 'West Manggarai', which is
-- correct (it's the regency Wae Rebo is in) but doesn't contain the
-- word "Flores", so the filter still missed it -- updated to mention
-- Flores explicitly. category is left untouched everywhere (the
-- filter doesn't read it).
--
-- Run in the Supabase SQL Editor, same as every earlier migration.

update products set location = 'Komodo National Park' where slug = '3-days-luxury-komodo-escape';
update products set location = 'Komodo National Park' where slug = '4-days-luxury-komodo-tour';
update products set location = 'Bali & Komodo' where slug = 'bali-komodo-tour-package';
update products set location = 'Bali' where slug = 'bali-adventure-tour';
update products set location = 'Bali & Gili Islands' where slug = 'bali-and-gili-islands-tour';
update products set location = 'Bali & Lombok' where slug = 'bali-and-lombok-trip';
update products set location = 'Bali & Nusa Penida' where slug = 'bali-and-nusa-penida-tour';
update products set location = 'Ubud, Bali' where slug = 'bali-cultural-tour';
update products set location = 'Bali' where slug = 'bali-family-tour-holiday';
update products set location = 'Bali' where slug = 'bali-highlights-tour';
update products set location = 'Bali' where slug = 'bali-honeymoon-tour';
update products set location = 'Flores' where slug = 'flores-overland-tour';
update products set location = 'Flores' where slug = 'flores-kelimutu-wae-rebo-tour';
update products set location = 'Bali, Lombok & Komodo' where slug = 'indonesia-islands-adventure-bali-lombok-komodo';
update products set location = 'Bromo, Komodo & Bali' where slug = 'indonesia-adventure-bromo-komodo-bali-discovery';
update products set location = 'Java & Bali' where slug = 'java-bali-trip';
update products set location = 'Komodo National Park' where slug = 'komodo-boat-tour';
update products set location = 'Sumba' where slug = 'sumba-6-days-adventure-tour';
update products set location = 'Sumba' where slug = 'sumba-4-days-tour';
update products set location = 'Sumba' where slug = 'sumba-3-days-tour';
update products set location = 'Sumba' where slug = 'sumba-5-days-tour';
update products set location = 'Flores (West Manggarai)' where slug = 'wae-rebo-trek-tour';
