# Adventure Lombok - Review Push (WordPress plugin)

Companion plugin for adventure-lombok.com (spec §6n). Receives reviews
published in the booking app and posts them as comments on the
matching tour page, so a review collected in the booking app also
shows up on the main site.

## Install

1. Zip the `adventure-lombok-review-push` folder (the whole folder,
   not just the `.php` file inside it).
2. In WordPress admin: **Plugins → Add New → Upload Plugin**, choose
   the zip, click **Install Now**, then **Activate**.
3. Go to **Settings → Booking Review Push**. Note the exact REST URL
   shown there (looks like
   `https://adventure-lombok.com/wp-json/alr-reviews/v1/push`).
4. Generate a random secret (the booking app's operator will usually
   hand you one to paste in) and save it on this settings page.
5. In the booking app's Vercel project (Settings → Environment
   Variables), set:
   - `WORDPRESS_REVIEW_PUSH_URL` = the REST URL from step 3
   - `WORDPRESS_REVIEW_PUSH_SECRET` = the exact same secret from step 4

## How it decides which page a review belongs to

Each product in the booking app can optionally store a `source_url`
pointing at its adventure-lombok.com page. A review only ever pushes
if that's set. The plugin resolves `source_url` to a WordPress post ID
via `url_to_postid()`, so the URL has to be the real, final URL of
that page on this site (not a redirect, not a shortlink).

## How a review displays

This plugin inserts a normal WordPress **comment** on the matching
post, with the star rating stored as comment meta under the key
`rating` -- the same key WooCommerce product reviews use, on the bet
that the theme already renders it. If reviews show up as plain text
comments with no stars, that's the sign the theme expects something
different; check how the theme's own review/rating display works and
this plugin's `update_comment_meta($comment_id, 'rating', $rating)`
call can be adjusted to match.
