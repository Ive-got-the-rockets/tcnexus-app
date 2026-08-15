<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_Activator {

	public static function activate() {
		self::create_views_table();
		TCNexus_Post_Types::register();
		self::seed_access_tier_terms();
		if ( false === get_option( 'tcnexus_free_limit' ) ) {
			add_option( 'tcnexus_free_limit', 5 );
		}
		flush_rewrite_rules();
	}

	private static function create_views_table() {
		global $wpdb;
		$table_name      = $wpdb->prefix . TCNEXUS_LMS_TABLE_VIEWS;
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table_name} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			visitor_id VARCHAR(64) NOT NULL DEFAULT '',
			ip_address VARCHAR(45) NOT NULL DEFAULT '',
			user_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
			lesson_id BIGINT UNSIGNED NOT NULL,
			tier VARCHAR(20) NOT NULL DEFAULT 'free',
			viewed_at DATETIME NOT NULL,
			PRIMARY KEY  (id),
			KEY visitor_id (visitor_id),
			KEY ip_address (ip_address),
			KEY user_id (user_id),
			KEY lesson_id (lesson_id)
		) {$charset_collate};";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );
	}

	private static function seed_access_tier_terms() {
		$terms = array( 'free', 'registered', 'paid' );
		foreach ( $terms as $slug ) {
			if ( ! term_exists( $slug, 'access_tier' ) ) {
				wp_insert_term( ucfirst( $slug ), 'access_tier', array( 'slug' => $slug ) );
			}
		}
	}
}
