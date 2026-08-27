<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_Membership {

	public static function get_user_tier( $user_id ) {
		if ( ! $user_id ) {
			return 'anonymous';
		}
		$tier = get_user_meta( $user_id, 'tcnexus_tier', true );
		return $tier ? $tier : 'registered';
	}

	public static function set_user_tier( $user_id, $tier ) {
		if ( ! in_array( $tier, array( 'registered', 'paid' ), true ) ) {
			return false;
		}
		return update_user_meta( $user_id, 'tcnexus_tier', $tier );
	}

	public static function get_user_id_from_token( $token ) {
		if ( ! $token ) {
			return 0;
		}
		$users = get_users( array(
			'meta_key'   => 'tcnexus_api_token',
			'meta_value' => $token,
			'number'     => 1,
			'fields'     => 'ID',
		) );
		return ! empty( $users ) ? (int) $users[0] : 0;
	}

	/**
	 * Registers a new account from just an email address and emails the
	 * generated login credentials. Returns array( 'user_id', 'token' ) on
	 * success or a WP_Error on failure.
	 */
	public static function register_from_email( $email ) {
		$email = sanitize_email( $email );
		if ( ! is_email( $email ) ) {
			return new WP_Error( 'invalid_email', 'Please enter a valid email address.' );
		}

		if ( email_exists( $email ) ) {
			return new WP_Error( 'email_exists', 'An account with this email already exists.' );
		}

		$username = self::generate_username_from_email( $email );
		$password = wp_generate_password( 16, false );

		$user_id = wp_insert_user( array(
			'user_login' => $username,
			'user_email' => $email,
			'user_pass'  => $password,
			'role'       => 'subscriber',
		) );

		if ( is_wp_error( $user_id ) ) {
			return $user_id;
		}

		self::set_user_tier( $user_id, 'registered' );

		$token = wp_generate_password( 40, false, false );
		update_user_meta( $user_id, 'tcnexus_api_token', $token );

		self::send_welcome_email( $email, $username, $password );

		return array(
			'user_id' => $user_id,
			'token'   => $token,
		);
	}

	/**
	 * Logs in with the email + password from the welcome email.
	 * Returns array( 'user_id', 'token' ) on success or a WP_Error on failure.
	 */
	public static function login_from_email( $email, $password ) {
		$email = sanitize_email( $email );
		if ( ! is_email( $email ) || $password === '' ) {
			return new WP_Error( 'invalid_credentials', 'Email or password is incorrect.' );
		}

		$user = get_user_by( 'email', $email );
		if ( ! $user || ! wp_check_password( $password, $user->user_pass, $user->ID ) ) {
			return new WP_Error( 'invalid_credentials', 'Email or password is incorrect.' );
		}

		$token = get_user_meta( $user->ID, 'tcnexus_api_token', true );
		if ( ! $token ) {
			$token = wp_generate_password( 40, false, false );
			update_user_meta( $user->ID, 'tcnexus_api_token', $token );
		}

		return array(
			'user_id' => $user->ID,
			'token'   => $token,
		);
	}

	private static function generate_username_from_email( $email ) {
		$base     = sanitize_user( current( explode( '@', $email ) ), true );
		$username = $base;
		$suffix   = 1;
		while ( username_exists( $username ) ) {
			$username = $base . $suffix;
			$suffix++;
		}
		return $username;
	}

	private static function send_welcome_email( $email, $username, $password ) {
		$site_name = get_bloginfo( 'name' );
		$subject   = sprintf( 'Your %s account details', $site_name );
		$message   = "Welcome!\n\n"
			. "Your account has been created. You can use these details to log in:\n\n"
			. "Username: {$username}\n"
			. "Password: {$password}\n\n"
			. "You can now continue watching Registered content.";

		wp_mail( $email, $subject, $message );
	}
}
