-- Twelve "Extension Trip" products (Bali, Sumba, Komodo, Flores --
-- three per destination), transcribed from the founder's existing
-- adventure-lombok.com site screenshots so the new "Extension Trips"
-- header filter (see extensionDestinations.ts) has real listings to
-- show instead of an empty grid.
--
-- Three things every one of these rows still needs before launch:
--   1. A real cover photo -- none is set here (cover_image_url stays
--      null, same "Photo coming soon" placeholder as any other
--      product with no photo yet). Upload one per product from
--      /admin/products -- see the per-product "photo:" comment below
--      for which shot on the old site to grab. New uploads are
--      auto-compressed, so no need to resize by hand first.
--   2. A full write-up -- `description` here is just the short
--      listing-page blurb wrapped in a paragraph, not the longer copy
--      each trip's own detail page likely has on the old site. Expand
--      it from /admin/products whenever convenient.
--   3. Price double-check -- transcribed from a small screenshot, so
--      confirm each adult_price_usd against the real figure before
--      relying on it for real bookings.
--
-- is_bookable = true (instant book & pay, same flow as the Lombok day
-- trips) per the founder's explicit choice. min_lead_hours = 72 (3
-- days), not the usual 10-hour default -- these are multi-day,
-- logistically-coordinated trips (boats, flights, permits), so they
-- need more notice than a same-day Lombok activity; the 0036 migration
-- that added this column specifically suggests 72 as a starting point
-- for exactly this case. Raise or lower per product from the admin if
-- that's wrong for a particular trip.
--
-- Run in the Supabase SQL Editor, same as every earlier migration.

insert into products (
  product_type, slug, title, excerpt, description, location, category,
  duration_label, duration_days, adult_price_usd, is_bookable, min_lead_hours, status
) values

-- Bali -- photo: temple statues/offerings (Tirta Empul style)
('tour', 'bali-cultural-discovery-tour', 'Bali Cultural Discovery Tour',
 'A cultural tour from Ubud''s temples, traditional art villages, and rice terraces.',
 '<p>A cultural tour from Ubud''s temples, traditional art villages, and rice terraces.</p>',
 'Ubud, Bali', 'Extension Trip', '3 Days / 2 Nights', 3, 650, true, 72, 'active'),

-- Bali -- photo: temple silhouette at sunset
('tour', 'bali-highlights-tour', 'Bali Highlights Tour',
 'A 4-day Bali highlights tour covering Kintamani, rice terraces, Ubud, and beaches.',
 '<p>A 4-day Bali highlights tour covering Kintamani, rice terraces, Ubud, and beaches.</p>',
 'Bali', 'Extension Trip', '4 Days', 4, 845, true, 72, 'active'),

-- Bali -- photo: Komodo boat/overlook group shot
('tour', 'bali-komodo-tour', 'Bali & Komodo Tour',
 'Explore Bali & Komodo in 6 days, discovering two of Indonesia''s nature & culture gems.',
 '<p>Explore Bali & Komodo in 6 days, discovering two of Indonesia''s nature & culture gems.</p>',
 'Bali & Komodo', 'Extension Trip', '6 Days', 6, 2299, true, 72, 'active'),

-- Sumba -- photo: natural rock arch over a turquoise lagoon
('tour', 'sumba-tour-experience-3-days', 'Sumba Tour Experience in 3 Days',
 'Come to Sumba on a 3-day tour -- swim in Weekuri Lagoon, visit Ratenggaro Village, and stay at wild beaches.',
 '<p>Come to Sumba on a 3-day tour -- swim in Weekuri Lagoon, visit Ratenggaro Village, and stay at wild beaches.</p>',
 'Sumba', 'Extension Trip', '3 Days', 3, 575, true, 72, 'active'),

-- Sumba -- photo: savanna trees at sunset
('tour', 'sumba-tour-discover-4-days', 'Sumba Tour Discover in 4 Days',
 'Discover the best of Sumba on a 4-day tour -- traditional villages, hidden waterfalls, and pristine beaches.',
 '<p>Discover the best of Sumba on a 4-day tour -- traditional villages, hidden waterfalls, and pristine beaches.</p>',
 'Sumba', 'Extension Trip', '4 Days', 4, 845, true, 72, 'active'),

-- Sumba -- photo: aerial coastal cove
('tour', 'sumba-tour-explore-5-days', 'Sumba Tour Explore in 5 Days',
 'Experience the best of Sumba on a 5-day tour -- traditional villages, waterfalls, rolling hills, and pristine beaches.',
 '<p>Experience the best of Sumba on a 5-day tour -- traditional villages, waterfalls, rolling hills, and pristine beaches.</p>',
 'Sumba', 'Extension Trip', '5 Days', 5, 898, true, 72, 'active'),

-- Komodo -- photo: traditional phinisi boat on the water
('tour', 'komodo-boat-tour', 'Komodo Boat Tour',
 'A 2-day return Labuan Bajo boat trip -- see Komodo dragons, Pink Beach, and great snorkeling spots.',
 '<p>A 2-day return Labuan Bajo boat trip -- see Komodo dragons, Pink Beach, and great snorkeling spots.</p>',
 'Komodo National Park', 'Extension Trip', '2 Days', 2, 695, true, 72, 'active'),

-- Komodo -- photo: boat-bow view over turquoise water
('tour', '3-days-luxury-komodo-escape', '3 Days Luxury Komodo Escape',
 'Swim with manta rays and see Komodo dragons on this 3-day luxury private boat charter.',
 '<p>Swim with manta rays and see Komodo dragons on this 3-day luxury private boat charter.</p>',
 'Komodo National Park', 'Extension Trip', '3 Days', 3, 2150, true, 72, 'active'),

-- Komodo -- photo: group photo with Komodo dragon
('tour', '4-days-luxury-komodo-tour', '4 Days Luxury Komodo Tour',
 'A 4-day Komodo tour aboard a luxury private boat -- cruise to Rinca Island dragons and Padar Island snorkeling.',
 '<p>A 4-day Komodo tour aboard a luxury private boat -- cruise to Rinca Island dragons and Padar Island snorkeling.</p>',
 'Komodo National Park', 'Extension Trip', '4 Days', 4, 3760, true, 72, 'active'),

-- Flores -- photo: conical thatched-roof village huts (Wae Rebo)
('tour', 'wae-rebo-trek-3-days', 'Wae Rebo Trek, 3 Days Flores Cloud Village Tour',
 'A 3-day trek to the cloud-nested village of Wae Rebo, with an overnight homestay.',
 '<p>A 3-day trek to the cloud-nested village of Wae Rebo, with an overnight homestay.</p>',
 'Flores', 'Extension Trip', '3 Days', 3, 456, true, 72, 'active'),

-- Flores -- photo: sunrise over layered highland hills
('tour', 'flores-overland-tour-5-day-kelimutu-crossing', 'Flores Overland Tour, 5-Day Kelimutu Crossing',
 'A 5-day Flores overland tour from Labuan Bajo to Kelimutu''s tri-color lakes, highland villages, and hot springs.',
 '<p>A 5-day Flores overland tour from Labuan Bajo to Kelimutu''s tri-color lakes, highland villages, and hot springs.</p>',
 'Flores', 'Extension Trip', '5 Days', 5, 895, true, 72, 'active'),

-- Flores -- photo: tri-colored crater lakes, aerial view
('tour', 'grand-flores-overland-7-days', 'Grand Flores Overland, 7 Days Kelimutu & Wae Rebo Tour',
 'A full 7-day Flores overland tour across the island -- the cloud village, tri-color lakes, hot springs, and more.',
 '<p>A full 7-day Flores overland tour across the island -- the cloud village, tri-color lakes, hot springs, and more.</p>',
 'Flores', 'Extension Trip', '7 Days', 7, 1350, true, 72, 'active');
