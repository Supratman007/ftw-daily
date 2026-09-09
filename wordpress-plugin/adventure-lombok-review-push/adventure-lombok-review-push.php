<?php
/**
 * Plugin Name: Adventure Lombok - Review Push
 * Description: Receives reviews pushed from the Adventure Lombok booking app (booking.adventure-lombok.com) and posts them as comments on the matching tour/trip page, so reviews collected in the booking app also show up here. Spec §6n.
 * Version: 1.0.3
 * Author: Adventure Lombok Tour
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Diagnostic only -- visit https://yoursite.com/?alr_debug=1 to confirm
 * this plugin's code is actually running at all, independent of the
 * REST API. If this doesn't print anything, the plugin file itself
 * isn't executing (a hosting/caching issue) rather than anything
 * REST-specific. Safe to remove once the "no route found" issue is
 * sorted out -- it doesn't expose anything sensitive.
 */
add_action('init', function () {
    if (!isset($_GET['alr_debug'])) {
        return;
    }
    header('Content-Type: text/plain');
    echo "Adventure Lombok Review Push plugin is loaded and running.\n";
    echo "Plugin version: 1.0.1\n";
    echo "PHP version: " . phpversion() . "\n";
    echo "Site URL: " . site_url() . "\n";
    echo "Ping route: " . rest_url('alr-reviews/v1/ping') . "\n";
    echo "Push route: " . rest_url('alr-reviews/v1/push') . "\n";
    exit;
}, 1);

/**
 * Diagnostic only -- visit https://yoursite.com/?alr_debug_comments=1
 * while logged in as an admin to see the last 10 comments on the site
 * and every bit of comment-meta stored against each one. Compares a
 * review the theme already displays correctly (with stars) against
 * one this plugin posted, to find the actual meta key the theme's
 * review widget reads the star rating from -- "rating" (this plugin's
 * current guess) clearly isn't it, since the pushed review shows "Not
 * Rated". Add &id=<comment ID> (a separate parameter, not the value
 * of alr_debug_comments itself) to look at one specific comment
 * instead of the last 10.
 */
add_action('init', function () {
    if (!isset($_GET['alr_debug_comments'])) {
        return;
    }
    if (!current_user_can('manage_options')) {
        wp_die('Log into WordPress admin first, then reload this link.');
    }
    header('Content-Type: text/plain');

    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    $comments = $id > 0 ? array_filter([get_comment($id)]) : get_comments(['number' => 10, 'orderby' => 'comment_date_gmt', 'order' => 'DESC']);

    if (empty($comments)) {
        echo "No comments found.\n";
        exit;
    }

    foreach ($comments as $c) {
        echo "Comment #{$c->comment_ID} on post {$c->comment_post_ID} -- by \"{$c->comment_author}\" -- {$c->comment_date}\n";
        echo "Content: " . mb_substr($c->comment_content, 0, 60) . "...\n";
        $meta = get_comment_meta($c->comment_ID);
        if (empty($meta)) {
            echo "  (no comment-meta at all)\n";
        } else {
            foreach ($meta as $key => $values) {
                echo "  meta key \"$key\" = " . implode(', ', $values) . "\n";
            }
        }
        echo "\n";
    }
    exit;
}, 1);

/**
 * Settings screen: one field, a shared secret. This must be pasted
 * into the booking app's WORDPRESS_REVIEW_PUSH_SECRET setting too --
 * both sides need to match, or the booking app's push requests are
 * rejected. Find it under Settings -> Booking Review Push.
 */
add_action('admin_menu', function () {
    add_options_page(
        'Booking Review Push',
        'Booking Review Push',
        'manage_options',
        'alr-review-push',
        'alr_review_push_settings_page'
    );
});

add_action('admin_init', function () {
    register_setting('alr_review_push', 'alr_review_push_secret');
});

function alr_review_push_settings_page() {
    $rest_url = rest_url('alr-reviews/v1/push');
    ?>
    <div class="wrap">
        <h1>Booking App Review Push</h1>
        <p>
            This is the receiving end for reviews sent over from the booking app
            (booking.adventure-lombok.com). Two things need to match on both sides:
        </p>
        <ol>
            <li>The shared secret below must be exactly the same as
                <code>WORDPRESS_REVIEW_PUSH_SECRET</code> in the booking app's settings.</li>
            <li>The booking app's <code>WORDPRESS_REVIEW_PUSH_URL</code> setting must be set to
                this exact address: <code><?php echo esc_html($rest_url); ?></code></li>
        </ol>
        <form method="post" action="options.php">
            <?php settings_fields('alr_review_push'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="alr_review_push_secret">Shared Secret</label></th>
                    <td>
                        <input
                            type="text"
                            id="alr_review_push_secret"
                            name="alr_review_push_secret"
                            value="<?php echo esc_attr(get_option('alr_review_push_secret')); ?>"
                            class="regular-text"
                        />
                        <p class="description">
                            A random password only the booking app knows -- paste the exact same value
                            into the booking app's Vercel settings.
                        </p>
                    </td>
                </tr>
            </table>
            <?php submit_button('Save Secret'); ?>
        </form>
    </div>
    <?php
}

/**
 * The endpoint the booking app POSTs a published review to. Matches
 * which page the review belongs to via source_url (the exact
 * adventure-lombok.com page URL, already stored on that product in
 * the booking app) rather than a shared ID, since this plugin has no
 * other concept of the booking app's product records.
 */
add_action('rest_api_init', function () {
    // A trivial GET route with no auth at all -- if this also 404s as
    // "no route found" while /push does too, the problem is REST route
    // registration itself, not anything specific to /push's logic.
    register_rest_route('alr-reviews/v1', '/ping', [
        'methods' => 'GET',
        'callback' => function () {
            return new WP_REST_Response(['ok' => true, 'plugin' => 'alr-review-push', 'version' => '1.0.1'], 200);
        },
        'permission_callback' => '__return_true',
    ]);

    register_rest_route('alr-reviews/v1', '/push', [
        'methods' => 'POST',
        'callback' => 'alr_review_push_handle',
        // Auth is the shared-secret header check inside the handler,
        // not WordPress's own REST auth -- the booking app calls this
        // with no WordPress user session at all.
        'permission_callback' => '__return_true',
    ]);
});

function alr_review_push_handle(WP_REST_Request $request) {
    $configured_secret = get_option('alr_review_push_secret');
    $provided_secret = $request->get_header('x-alr-secret');
    if (empty($configured_secret) || !hash_equals((string) $configured_secret, (string) $provided_secret)) {
        return new WP_REST_Response(['error' => 'unauthorized'], 401);
    }

    $body = $request->get_json_params();
    $source_url = isset($body['source_url']) ? esc_url_raw($body['source_url']) : '';
    $rating = isset($body['rating']) ? intval($body['rating']) : 0;
    $reviewer_name = isset($body['reviewer_name']) ? sanitize_text_field($body['reviewer_name']) : 'A traveler';
    $title = isset($body['title']) ? sanitize_text_field($body['title']) : '';
    $review_text = isset($body['body']) ? sanitize_textarea_field($body['body']) : '';
    $external_id = isset($body['review_id']) ? sanitize_text_field($body['review_id']) : '';

    if (!$source_url || $rating < 1 || $rating > 5) {
        return new WP_REST_Response(['error' => 'missing_or_invalid_fields'], 400);
    }

    $post_id = url_to_postid($source_url);
    if (!$post_id) {
        return new WP_REST_Response(['error' => 'no_matching_page_for_source_url'], 404);
    }

    // The booking app retries a failed push -- without this check,
    // a retry that actually succeeded server-side but reported a
    // timeout to the booking app would post the same review twice.
    if ($external_id) {
        $existing = get_comments([
            'post_id' => $post_id,
            'meta_key' => 'alr_review_id',
            'meta_value' => $external_id,
            'number' => 1,
        ]);
        if (!empty($existing)) {
            return new WP_REST_Response(['ok' => true, 'note' => 'already_pushed'], 200);
        }
    }

    $comment_content = $title !== '' ? ($title . "\n\n" . $review_text) : $review_text;

    $comment_id = wp_insert_comment([
        'comment_post_ID' => $post_id,
        'comment_author' => $reviewer_name,
        'comment_content' => $comment_content,
        'comment_approved' => 1,
        'comment_type' => 'comment',
    ]);

    if (!$comment_id) {
        return new WP_REST_Response(['error' => 'insert_failed'], 500);
    }

    // "rating" is the same comment-meta key WooCommerce product
    // reviews use for their star rating -- a reasonable default bet
    // that your theme's existing review display already looks for it.
    // If reviews land as plain comments with no stars showing, this is
    // the key to point your theme (or a small template tweak) at.
    update_comment_meta($comment_id, 'rating', $rating);
    if ($external_id) {
        update_comment_meta($comment_id, 'alr_review_id', $external_id);
    }

    return new WP_REST_Response(['ok' => true, 'comment_id' => $comment_id], 200);
}
