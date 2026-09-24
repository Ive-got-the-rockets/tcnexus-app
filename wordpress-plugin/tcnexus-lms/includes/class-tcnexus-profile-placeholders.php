<?php

/**
 * Persists one of the bundled TC profile placeholders for people without a
 * real uploaded profile image. The assignment remains stable until an image
 * is selected in the builder.
 */
class TCNexus_Profile_Placeholders {

	const META_KEY = '_tcnexus_profile_placeholder_index';
	const PLACEHOLDER_COUNT = 25;

	public static function assign_if_missing( $post_id ) {
		if ( get_post_thumbnail_id( $post_id ) ) {
			self::clear( $post_id );
			return null;
		}

		$index = absint( get_post_meta( $post_id, self::META_KEY, true ) );
		if ( $index < 1 || $index > self::PLACEHOLDER_COUNT ) {
			$index = function_exists( 'random_int' ) ? random_int( 1, self::PLACEHOLDER_COUNT ) : wp_rand( 1, self::PLACEHOLDER_COUNT );
			update_post_meta( $post_id, self::META_KEY, $index );
		}

		return self::get_url( $index );
	}

	public static function clear( $post_id ) {
		delete_post_meta( $post_id, self::META_KEY );
	}

	public static function get_saved_url( $post_id ) {
		$index = absint( get_post_meta( $post_id, self::META_KEY, true ) );
		return $index >= 1 && $index <= self::PLACEHOLDER_COUNT ? self::get_url( $index ) : null;
	}

	private static function get_url( $index ) {
		return TCNEXUS_LMS_URL . 'assets/profile-placeholders/tc-logo-' . str_pad( (string) absint( $index ), 2, '0', STR_PAD_LEFT ) . '.png';
	}
}
