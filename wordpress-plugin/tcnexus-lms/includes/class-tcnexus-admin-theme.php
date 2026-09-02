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
		// WordPress normally generates this exact suffix for a submenu page,
		// but matching the page slug keeps the styling working across local
		// installs that normalize the parent menu slug differently.
		$is_membership_screen = false !== strpos( $hook, '_page_tcnexus-visitor-tracking' );
		$is_popup_details_screen = false !== strpos( $hook, '_page_tcnexus-registration-settings' );
		$is_animation_screen = false !== strpos( $hook, '_page_tcnexus-card-carousel-animation' ) || false !== strpos( $hook, '_page_tcnexus-animations' );

		if ( ! $is_taxonomy_screen && ! $is_membership_screen && ! $is_popup_details_screen && ! $is_animation_screen ) {
			return;
		}

		wp_enqueue_style(
			'tcnexus-builder-fonts',
			'https://fonts.googleapis.com/css2?family=Fraunces:wght@300;400;500;600;700;900&family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap',
			array(),
			null
		);

		if ( $is_taxonomy_screen ) {
			wp_enqueue_style(
				'tcnexus-admin-taxonomy',
				TCNEXUS_LMS_URL . 'assets/admin-taxonomy.css',
				array(),
				TCNEXUS_LMS_VERSION
			);
		}

		if ( $is_membership_screen || $is_popup_details_screen || $is_animation_screen ) {
			wp_enqueue_style(
				'tcnexus-admin-membership',
				TCNEXUS_LMS_URL . 'assets/admin-membership.css',
				array(),
				TCNEXUS_LMS_VERSION
			);
		}

		if ( $is_popup_details_screen ) {
			wp_enqueue_style(
				'tcnexus-course-builder',
				TCNEXUS_LMS_URL . 'assets/course-builder.css',
				array(),
				TCNEXUS_LMS_VERSION
			);
			wp_enqueue_media();
			wp_enqueue_script(
				'tcnexus-popup-details',
				TCNEXUS_LMS_URL . 'assets/admin-popup-details.js',
				array(),
				TCNEXUS_LMS_VERSION,
				true
			);
			wp_enqueue_script(
				'tcnexus-course-builder',
				TCNEXUS_LMS_URL . 'assets/course-builder.js',
				array(),
				TCNEXUS_LMS_VERSION,
				true
			);
			TCNexus_Media::localize( 'tcnexus-course-builder' );
		}
	}
}
