<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_CORS {

	private static $allowed_origins = array(
		'https://dev.tcnexus.tv',
		'http://localhost:4200',
	);

	public static function register() {
		remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
		add_filter( 'rest_pre_serve_request', array( __CLASS__, 'send_headers' ) );
	}

	public static function send_headers( $value ) {
		$origin = get_http_origin();

		if ( $origin && in_array( $origin, self::$allowed_origins, true ) ) {
			header( 'Access-Control-Allow-Origin: ' . esc_url_raw( $origin ) );
			header( 'Access-Control-Allow-Methods: GET, POST, OPTIONS' );
			header( 'Access-Control-Allow-Headers: Content-Type, X-Visitor-Id, X-Tcnexus-Token' );
			header( 'Access-Control-Allow-Credentials: true' );
			header( 'Vary: Origin' );
		}

		return $value;
	}
}
