<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_Registration_Settings {
	const OPTION_NAME = 'tcnexus_registration_settings';

	public static function register() {
		add_submenu_page(
			'tcnexus-membership',
			'Registration Settings',
			'Registration Settings',
			'list_users',
			'tcnexus-registration-settings',
			array( __CLASS__, 'render_page' )
		);
		add_action( 'admin_post_tcnexus_save_registration_settings', array( __CLASS__, 'handle_save' ) );
	}

	public static function get_defaults() {
		return array(
			'registration' => array(
				'heading'      => 'Register to continue watching.',
				'message'      => 'Create a free profile with your email to keep watching. We’ll send your login details by email.',
				'button_label' => 'Create Profile',
			),
			'final_free'   => array(
				'heading'      => 'This will be your last free lesson.',
				'message'      => 'Register your email to keep watching free lessons.',
				'button_label' => 'Create Profile',
			),
			'media'        => array(
				'type' => 'none',
				'url'  => '',
				'alt'  => '',
			),
		);
	}

	public static function get_settings() {
		$saved = get_option( self::OPTION_NAME, array() );
		return self::normalize( is_array( $saved ) ? $saved : array() );
	}

	public static function get_public_settings() {
		return self::get_settings();
	}

	private static function normalize( $input ) {
		$defaults = self::get_defaults();
		$settings = $defaults;

		foreach ( array( 'registration', 'final_free' ) as $section ) {
			if ( isset( $input[ $section ] ) && is_array( $input[ $section ] ) ) {
				foreach ( array( 'heading', 'message', 'button_label' ) as $field ) {
					if ( isset( $input[ $section ][ $field ] ) ) {
						$value = 'message' === $field ? sanitize_textarea_field( $input[ $section ][ $field ] ) : sanitize_text_field( $input[ $section ][ $field ] );
						if ( '' !== $value ) {
							$settings[ $section ][ $field ] = $value;
						}
					}
				}
			}
		}

		if ( isset( $input['media'] ) && is_array( $input['media'] ) ) {
			$type = isset( $input['media']['type'] ) ? sanitize_key( $input['media']['type'] ) : 'none';
			$url  = isset( $input['media']['url'] ) ? esc_url_raw( $input['media']['url'] ) : '';
			$alt  = isset( $input['media']['alt'] ) ? sanitize_text_field( $input['media']['alt'] ) : '';
			if ( in_array( $type, array( 'none', 'image', 'video' ), true ) ) {
				$settings['media']['type'] = $type;
			}
			$settings['media']['url'] = $url;
			$settings['media']['alt'] = $alt;
		}

		if ( 'none' === $settings['media']['type'] || '' === $settings['media']['url'] ) {
			$settings['media']['type'] = 'none';
			$settings['media']['url']  = '';
		}

		return $settings;
	}

	public static function render_page() {
		if ( ! current_user_can( 'list_users' ) ) {
			return;
		}
		$settings = self::get_settings();
		?>
		<div class="wrap">
			<h1>Registration Settings</h1>
			<?php if ( isset( $_GET['saved'] ) ) : ?>
				<div class="notice notice-success is-dismissible"><p>Registration settings saved.</p></div>
			<?php endif; ?>
			<p>Control the copy and optional media shown in the registration prompts.</p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="tcnexus_save_registration_settings" />
				<?php wp_nonce_field( 'tcnexus_save_registration_settings' ); ?>
				<h2>Registration Popup</h2>
				<table class="form-table" role="presentation">
					<tr><th><label for="tcnexus-registration-heading">Header text</label></th><td><input class="regular-text" id="tcnexus-registration-heading" name="registration[heading]" value="<?php echo esc_attr( $settings['registration']['heading'] ); ?>" /></td></tr>
					<tr><th><label for="tcnexus-registration-message">Message text</label></th><td><textarea class="large-text" rows="3" id="tcnexus-registration-message" name="registration[message]"><?php echo esc_textarea( $settings['registration']['message'] ); ?></textarea></td></tr>
					<tr><th><label for="tcnexus-registration-button">Button text</label></th><td><input class="regular-text" id="tcnexus-registration-button" name="registration[button_label]" value="<?php echo esc_attr( $settings['registration']['button_label'] ); ?>" /></td></tr>
				</table>
				<h2>Final Free Lesson Popup</h2>
				<table class="form-table" role="presentation">
					<tr><th><label for="tcnexus-final-heading">Header text</label></th><td><input class="regular-text" id="tcnexus-final-heading" name="final_free[heading]" value="<?php echo esc_attr( $settings['final_free']['heading'] ); ?>" /></td></tr>
					<tr><th><label for="tcnexus-final-message">Message text</label></th><td><textarea class="large-text" rows="3" id="tcnexus-final-message" name="final_free[message]"><?php echo esc_textarea( $settings['final_free']['message'] ); ?></textarea></td></tr>
					<tr><th><label for="tcnexus-final-button">Button text</label></th><td><input class="regular-text" id="tcnexus-final-button" name="final_free[button_label]" value="<?php echo esc_attr( $settings['final_free']['button_label'] ); ?>" /></td></tr>
				</table>
				<h2>Popup Media</h2>
				<table class="form-table" role="presentation">
					<tr><th><label for="tcnexus-media-type">Media type</label></th><td><select id="tcnexus-media-type" name="media[type]"><option value="none" <?php selected( $settings['media']['type'], 'none' ); ?>>None</option><option value="image" <?php selected( $settings['media']['type'], 'image' ); ?>>Image</option><option value="video" <?php selected( $settings['media']['type'], 'video' ); ?>>Video</option></select></td></tr>
					<tr><th><label for="tcnexus-media-url">Media URL</label></th><td><input class="large-text" type="url" id="tcnexus-media-url" name="media[url]" value="<?php echo esc_attr( $settings['media']['url'] ); ?>" /><p class="description">Paste a public image or video URL.</p></td></tr>
					<tr><th><label for="tcnexus-media-alt">Image alt text</label></th><td><input class="regular-text" id="tcnexus-media-alt" name="media[alt]" value="<?php echo esc_attr( $settings['media']['alt'] ); ?>" /></td></tr>
				</table>
				<?php submit_button( 'Save Registration Settings' ); ?>
			</form>
		</div>
		<?php
	}

	public static function handle_save() {
		if ( ! current_user_can( 'list_users' ) || ! isset( $_POST['_wpnonce'] ) || ! wp_verify_nonce( $_POST['_wpnonce'], 'tcnexus_save_registration_settings' ) ) {
			wp_die( 'Invalid request.' );
		}
		$input = isset( $_POST ) ? wp_unslash( $_POST ) : array();
		update_option( self::OPTION_NAME, self::normalize( $input ) );
		wp_safe_redirect( admin_url( 'admin.php?page=tcnexus-registration-settings&saved=1' ) );
		exit;
	}
}
