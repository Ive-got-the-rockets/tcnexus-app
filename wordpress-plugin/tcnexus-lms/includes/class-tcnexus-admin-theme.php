<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Cross-cutting admin styling for native WordPress screens under the
 * Courses menu that aren't fully custom pages of their own (currently just
 * the Course Types taxonomy screen) — keeps them on the same design system
 * as Course Builder and Instructors instead of default wp-admin chrome.
 */
class TCNexus_Admin_Theme {

	public static function enqueue_assets( $hook ) {
		$is_taxonomy_screen = in_array( $hook, array( 'edit-tags.php', 'term.php' ), true )
			&& isset( $_GET['taxonomy'] ) && 'course_type' === $_GET['taxonomy'];

		if ( ! $is_taxonomy_screen ) {
			return;
		}

		wp_enqueue_style(
			'tcnexus-builder-fonts',
			'https://fonts.googleapis.com/css2?family=Fraunces:wght@300;400;500;600;700;900&family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap',
			array(),
			null
		);

		wp_enqueue_style(
			'tcnexus-admin-taxonomy',
			TCNEXUS_LMS_URL . 'assets/admin-taxonomy.css',
			array(),
			TCNEXUS_LMS_VERSION
		);
	}
}
