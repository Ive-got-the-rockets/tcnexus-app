<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_Registration_Settings {
	const OPTION_NAME = 'tcnexus_registration_settings';

	public static function register() {
		add_submenu_page(
			'tcnexus-membership',
			'Popup Details',
			'Popup Details',
			'list_users',
			'tcnexus-registration-settings',
			array( __CLASS__, 'render_page' )
		);
	}

	public static function get_defaults() {
		return array(
			'registration' => array(
				'heading'      => 'Register to continue watching.',
				'message'      => 'Create a free profile with your email to keep watching. We’ll send your login details by email.',
				'button_label' => 'Create Profile',
				'media'        => array( 'type' => 'none', 'url' => '', 'alt' => '', 'attachment_id' => 0 ),
			),
			'final_free'   => array(
				'heading'      => 'This will be your last free lesson.',
				'message'      => 'Register your email to keep watching free lessons.',
				'button_label' => 'Create Profile',
				'media'        => array( 'type' => 'none', 'url' => '', 'alt' => '', 'attachment_id' => 0 ),
			),
			'paid_member'  => array(
				'heading'      => 'Become a paid member',
				'message'      => 'Become a paid member to access locked content and more.',
				'button_label' => 'Become a Paid Member',
				'media'        => array( 'type' => 'none', 'url' => '', 'alt' => '', 'attachment_id' => 0 ),
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

		$legacy_media = isset( $input['media'] ) && is_array( $input['media'] ) ? $input['media'] : array();
		foreach ( array( 'registration', 'final_free', 'paid_member' ) as $section ) {
			$section_input = isset( $input[ $section ] ) && is_array( $input[ $section ] ) ? $input[ $section ] : array();
			if ( ! empty( $section_input ) ) {
				foreach ( array( 'heading', 'message', 'button_label' ) as $field ) {
					if ( isset( $section_input[ $field ] ) ) {
						$value = 'message' === $field ? sanitize_textarea_field( $section_input[ $field ] ) : sanitize_text_field( $section_input[ $field ] );
						if ( '' !== $value ) {
							$settings[ $section ][ $field ] = $value;
						}
					}
				}
			}
			$media_input = isset( $section_input['media'] ) && is_array( $section_input['media'] ) ? $section_input['media'] : $legacy_media;
			$settings[ $section ]['media'] = self::normalize_media( $media_input );
		}

		return $settings;
	}

	private static function normalize_media( $input ) {
		$defaults = array( 'type' => 'none', 'url' => '', 'alt' => '', 'attachment_id' => 0 );
		if ( ! is_array( $input ) ) {
			return $defaults;
		}
		$type = isset( $input['type'] ) ? sanitize_key( $input['type'] ) : 'none';
		$type = in_array( $type, array( 'none', 'image', 'video' ), true ) ? $type : 'none';
		$attachment_id = isset( $input['attachment_id'] ) ? absint( $input['attachment_id'] ) : 0;
		$url = isset( $input['url'] ) ? esc_url_raw( $input['url'] ) : '';
		if ( 'image' === $type && $attachment_id ) {
			$url = wp_get_attachment_image_url( $attachment_id, 'large' );
		}
		if ( 'none' === $type || '' === $url ) {
			return $defaults;
		}
		return array(
			'type'          => $type,
			'url'           => $url,
			'alt'           => isset( $input['alt'] ) ? sanitize_text_field( $input['alt'] ) : '',
			'attachment_id' => $attachment_id,
		);
	}

	public static function render_page() {
		if ( ! current_user_can( 'list_users' ) ) {
			return;
		}
		$settings = self::get_settings();
		?>
		<div class="wrap tcn-membership-wrap tcn-popup-details-wrap">
			<div class="tcn-membership-header">
				<div>
					<p class="tcn-membership-eyebrow">Membership</p>
					<h1>Popup Details</h1>
				<p class="tcn-membership-subtitle">Manage the copy and media for each access popup. All popups use the same 16:9 media frame.</p>
				</div>
			</div>
			<?php if ( isset( $_GET['saved'] ) ) : ?>
				<div class="notice notice-success is-dismissible"><p>Registration settings saved.</p></div>
			<?php endif; ?>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="tcnexus_save_registration_settings" />
				<?php wp_nonce_field( 'tcnexus_save_registration_settings' ); ?>
				<?php self::render_popup_section( 'registration', 'Registration Popup', $settings['registration'] ); ?>
				<?php self::render_popup_section( 'final_free', 'Final Free Lesson Popup', $settings['final_free'] ); ?>
				<?php self::render_popup_section( 'paid_member', 'Become a Paid Member Popup', $settings['paid_member'] ); ?>
				<div class="tcn-popup-details__actions"><button type="submit" class="tcn-btn-ghost">Save Popup Details</button></div>
			</form>
		</div>
		<?php
	}

	private static function render_popup_section( $key, $title, $section ) {
		$media = $section['media'];
		$has_image = 'image' === $media['type'] && $media['attachment_id'];
		?>
		<section class="tcn-popup-card">
			<div class="tcn-popup-card__header"><h2><?php echo esc_html( $title ); ?></h2><span>16:9 media frame</span></div>
			<div class="tcn-popup-card__grid">
				<div class="tcn-popup-card__fields">
					<p class="tcn-popup-field"><label for="tcnexus-<?php echo esc_attr( $key ); ?>-heading">Header text</label><input id="tcnexus-<?php echo esc_attr( $key ); ?>-heading" name="<?php echo esc_attr( $key ); ?>[heading]" value="<?php echo esc_attr( $section['heading'] ); ?>" /></p>
					<p class="tcn-popup-field"><label for="tcnexus-<?php echo esc_attr( $key ); ?>-message">Message text</label><textarea rows="4" id="tcnexus-<?php echo esc_attr( $key ); ?>-message" name="<?php echo esc_attr( $key ); ?>[message]"><?php echo esc_textarea( $section['message'] ); ?></textarea></p>
					<p class="tcn-popup-field"><label for="tcnexus-<?php echo esc_attr( $key ); ?>-button"><?php echo esc_html( 'paid_member' === $key ? 'Paid member button text' : 'Register button text' ); ?></label><input id="tcnexus-<?php echo esc_attr( $key ); ?>-button" name="<?php echo esc_attr( $key ); ?>[button_label]" value="<?php echo esc_attr( $section['button_label'] ); ?>" /></p>
				</div>
				<div class="tcn-popup-card__media">
					<label>Popup media</label>
					<select name="<?php echo esc_attr( $key ); ?>[media][type]" class="tcn-select tcn-popup-media-type"><option value="none" <?php selected( $media['type'], 'none' ); ?>>None</option><option value="image" <?php selected( $media['type'], 'image' ); ?>>Image</option><option value="video" <?php selected( $media['type'], 'video' ); ?>>Video</option></select>
					<div class="tcn-popup-media-image" <?php if ( 'image' !== $media['type'] ) : ?>style="display:none"<?php endif; ?>>
						<?php TCNexus_Media::render_picker( 'Select Image', $key . '_media_attachment_id', $has_image ? $media['attachment_id'] : 0, 'Select popup image', 1280, 720, $key . '[media][attachment_id]' ); ?>
					</div>
					<div class="tcn-popup-media-video" <?php if ( 'video' !== $media['type'] ) : ?>style="display:none"<?php endif; ?>><input type="url" name="<?php echo esc_attr( $key ); ?>[media][url]" value="<?php echo esc_attr( 'video' === $media['type'] ? $media['url'] : '' ); ?>" placeholder="https://example.com/popup-video.mp4" /><p class="description">Muted autoplay video, without controls, displayed at 16:9.</p></div>
					<p class="tcn-popup-field"><label for="tcnexus-<?php echo esc_attr( $key ); ?>-alt">Image alt text</label><input id="tcnexus-<?php echo esc_attr( $key ); ?>-alt" name="<?php echo esc_attr( $key ); ?>[media][alt]" value="<?php echo esc_attr( $media['alt'] ); ?>" /></p>
				</div>
			</div>
		</section>
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
