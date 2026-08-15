<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_Access_Control {

	public static function get_visitor_ip() {
		$keys = array( 'HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR' );
		foreach ( $keys as $key ) {
			if ( ! empty( $_SERVER[ $key ] ) ) {
				$ip = trim( explode( ',', $_SERVER[ $key ] )[0] );
				if ( filter_var( $ip, FILTER_VALIDATE_IP ) ) {
					return $ip;
				}
			}
		}
		return '';
	}

	private static function table() {
		global $wpdb;
		return $wpdb->prefix . TCNEXUS_LMS_TABLE_VIEWS;
	}

	public static function has_viewed( $visitor_id, $ip, $user_id, $lesson_id ) {
		global $wpdb;
		$table = self::table();
		$sql   = $wpdb->prepare(
			"SELECT COUNT(*) FROM {$table} WHERE lesson_id = %d AND (visitor_id = %s OR ip_address = %s OR user_id = %d)",
			$lesson_id,
			$visitor_id,
			$ip,
			$user_id
		);
		return (int) $wpdb->get_var( $sql ) > 0;
	}

	public static function count_distinct_tier_views( $visitor_id, $ip, $user_id, $tier ) {
		global $wpdb;
		$table = self::table();
		$sql   = $wpdb->prepare(
			"SELECT COUNT(DISTINCT lesson_id) FROM {$table} WHERE tier = %s AND (visitor_id = %s OR ip_address = %s OR user_id = %d)",
			$tier,
			$visitor_id,
			$ip,
			$user_id
		);
		return (int) $wpdb->get_var( $sql );
	}

	public static function record_view( $visitor_id, $ip, $user_id, $lesson_id, $tier ) {
		global $wpdb;
		$wpdb->insert(
			self::table(),
			array(
				'visitor_id' => $visitor_id,
				'ip_address' => $ip,
				'user_id'    => $user_id,
				'lesson_id'  => $lesson_id,
				'tier'       => $tier,
				'viewed_at'  => current_time( 'mysql' ),
			),
			array( '%s', '%s', '%d', '%d', '%s', '%s' )
		);
	}

	public static function attach_anonymous_history_to_user( $visitor_id, $ip, $user_id ) {
		global $wpdb;
		$table = self::table();
		$wpdb->query( $wpdb->prepare(
			"UPDATE {$table} SET user_id = %d WHERE user_id = 0 AND (visitor_id = %s OR ip_address = %s)",
			$user_id,
			$visitor_id,
			$ip
		) );
	}

	public static function get_free_limit() {
		return (int) get_option( 'tcnexus_free_limit', 5 );
	}

	public static function count_total_lessons_for_tier( $tier ) {
		$query = new WP_Query( array(
			'post_type'      => 'tc_lesson',
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'tax_query'      => array(
				array(
					'taxonomy' => 'access_tier',
					'field'    => 'slug',
					'terms'    => $tier,
				),
			),
		) );
		return (int) $query->found_posts;
	}

	/**
	 * Decides whether the current visitor/user may access a lesson, and
	 * records the view when access is granted. Returns an assoc array with
	 * at least 'granted' (bool) and 'reason' (string).
	 */
	public static function evaluate_access( $lesson_id, $visitor_id, $user_id ) {
		$tier = TCNexus_Post_Types::get_lesson_tier( $lesson_id );
		$ip   = self::get_visitor_ip();
		$user_tier = TCNexus_Membership::get_user_tier( $user_id );

		if ( 'paid' === $tier ) {
			if ( 'paid' === $user_tier ) {
				return array( 'granted' => true, 'reason' => 'ok', 'tier' => $tier );
			}
			return array( 'granted' => false, 'reason' => 'requires_payment', 'tier' => $tier );
		}

		if ( 'registered' === $tier ) {
			if ( in_array( $user_tier, array( 'registered', 'paid' ), true ) ) {
				self::record_view_once( $visitor_id, $ip, $user_id, $lesson_id, $tier );
				$viewed_all = self::count_distinct_tier_views( $visitor_id, $ip, $user_id, 'registered' )
					>= self::count_total_lessons_for_tier( 'registered' );
				return array(
					'granted'            => true,
					'reason'             => 'ok',
					'tier'               => $tier,
					'all_registered_seen' => $viewed_all,
				);
			}
			return array( 'granted' => false, 'reason' => 'requires_registration', 'tier' => $tier );
		}

		// Free tier.
		if ( in_array( $user_tier, array( 'registered', 'paid' ), true ) ) {
			self::record_view_once( $visitor_id, $ip, $user_id, $lesson_id, $tier );
			return array( 'granted' => true, 'reason' => 'ok', 'tier' => $tier );
		}

		$already_seen = self::has_viewed( $visitor_id, $ip, 0, $lesson_id );
		$free_limit   = self::get_free_limit();
		$distinct_seen = self::count_distinct_tier_views( $visitor_id, $ip, 0, 'free' );

		if ( $already_seen || $distinct_seen < $free_limit ) {
			self::record_view_once( $visitor_id, $ip, $user_id, $lesson_id, $tier );
			return array(
				'granted'          => true,
				'reason'           => 'ok',
				'tier'             => $tier,
				'free_views_used'  => $already_seen ? $distinct_seen : $distinct_seen + 1,
				'free_limit'       => $free_limit,
				'limit_reached'    => ( ! $already_seen && ( $distinct_seen + 1 ) >= $free_limit ),
			);
		}

		return array(
			'granted'    => false,
			'reason'     => 'requires_registration',
			'tier'       => $tier,
			'free_limit' => $free_limit,
		);
	}

	private static function record_view_once( $visitor_id, $ip, $user_id, $lesson_id, $tier ) {
		if ( ! self::has_viewed( $visitor_id, $ip, $user_id, $lesson_id ) ) {
			self::record_view( $visitor_id, $ip, $user_id, $lesson_id, $tier );
		}
	}
}
