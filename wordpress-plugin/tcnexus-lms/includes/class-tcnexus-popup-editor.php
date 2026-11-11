<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/** Saved schema and two-stage popup editor. The frontend consumes the same fields. */
class TCNexus_Popup_Editor {
	public static function defaults() {
		$defaults = json_decode( file_get_contents( __DIR__ . '/../assets/popup-editor-defaults.json' ), true );
		$defaults['image'] = TCNEXUS_LMS_URL . 'assets/neon-cheetah.png';
		return $defaults;
	}

	public static function normalize( $input ) {
		$defaults = self::defaults();
		$input = is_array( $input ) ? $input : array();
		$result = $defaults;
		foreach ( $defaults as $key => $fallback ) {
			if ( ! isset( $input[ $key ] ) || is_array( $input[ $key ] ) || is_object( $input[ $key ] ) ) { continue; }
			$value = $input[ $key ];
			if ( is_bool( $fallback ) ) {
				$result[ $key ] = filter_var( $value, FILTER_VALIDATE_BOOLEAN );
			} elseif ( is_numeric( $fallback ) ) {
				if ( ! is_numeric( $value ) || ! is_finite( (float) $value ) ) { continue; }
				$max = in_array( $key, array( 'firstOpacity', 'coverage', 'offerOpacity', 'annual', 'monthly', 'membership', 'store' ), true ) ? 100 : 10000;
				$min = 0;
				if ( 'width' === $key ) { $min = 320; $max = 1200; }
				if ( in_array( $key, array( 'bodySize', 'discountSize', 'footerSize' ), true ) ) { $min = 10; $max = 48; }
				if ( in_array( $key, array( 'creatingMs', 'successMs', 'transitionMs' ), true ) ) { $min = 100; }
				$result[ $key ] = max( $min, min( $max, (int) $value ) );
			} elseif ( 'image' === $key ) {
				$url = esc_url_raw( $value, array( 'http', 'https' ) );
				if ( preg_match( '#^https?://#i', $url ) ) { $result[ $key ] = $url; }
			} elseif ( 'fit' === $key ) {
				$result[ $key ] = 'cover' === $value ? 'cover' : 'contain';
			} elseif ( in_array( $key, array( 'textColor', 'cyan', 'shine' ), true ) ) {
				if ( preg_match( '/^#[0-9a-f]{6}$/i', $value ) ) { $result[ $key ] = $value; }
			} else {
				$result[ $key ] = sanitize_textarea_field( $value );
			}
		}
		return $result;
	}

	public static function render( $settings ) {
		$frame_url = add_query_arg(
			array(
				'action'   => 'tcnexus_popup_editor_frame',
				'_wpnonce' => wp_create_nonce( 'tcnexus_popup_editor_frame' ),
			),
			admin_url( 'admin-post.php' )
		);
		?>
		<iframe title="Registration popup editor" src="<?php echo esc_url( $frame_url ); ?>" style="display:block;width:100%;height:1100px;border:1px solid #e5e2d9;border-radius:16px;margin:20px 0;background:#fffdf9"></iframe>
		<?php
	}

	/**
	 * Serve the editor in a first-party frame. A URL frame is more reliable than
	 * an srcdoc frame in WordPress admin installations that restrict inline data
	 * documents through a Content Security Policy.
	 */
	public static function render_frame() {
		if ( ! current_user_can( 'list_users' ) ) {
			wp_die( esc_html__( 'You do not have permission to edit popup settings.', 'tcnexus-lms' ), 403 );
		}
		check_admin_referer( 'tcnexus_popup_editor_frame' );

		$settings = TCNexus_Registration_Settings::get_settings();
		$config = array(
			'settings' => isset( $settings['editor'] ) ? $settings['editor'] : self::defaults(),
			'defaults' => self::defaults(),
			'action'   => admin_url( 'admin-post.php' ),
			'nonce'    => wp_create_nonce( 'tcnexus_save_registration_settings' ),
		);
		$html = file_get_contents( __DIR__ . '/../assets/popup-editor.html' );
		$html = str_replace( '__TCN_POPUP_CONFIG__', wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT ), $html );

		header( 'Content-Type: text/html; charset=' . get_option( 'blog_charset' ) );
		echo $html; // The editor document is a trusted plugin asset; dynamic values are JSON encoded above.
		exit;
	}
}
