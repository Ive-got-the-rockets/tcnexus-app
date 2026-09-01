<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_Registration_Settings {
	const OPTION_NAME = 'tcnexus_registration_settings';
	const PAID_MEMBERSHIP_OPTION_NAME = 'tcnexus_paid_membership_settings';

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

	public static function get_paid_membership_defaults() {
		return array(
			'heading'      => 'Unlock the full library',
			'message'      => 'Choose the access level that fits the way you trade.',
			'save_percent' => 20,
			'currency'     => '$',
			'close_label'  => '×',
			'tiers'        => array(
				array( 'name' => 'Starter', 'description' => 'A focused path into the core library.', 'monthly_price' => 15, 'button_label' => 'Choose Starter', 'bullets' => array( 'Core free library', 'Weekly market notes', 'Member profile' ) ),
				array( 'name' => 'Trader', 'description' => 'The complete learning path for serious traders.', 'monthly_price' => 29, 'button_label' => 'Choose Trader', 'bullets' => array( 'Everything in Starter', 'All registered lessons', 'Live market sessions' ) ),
				array( 'name' => 'Pro Desk', 'description' => 'Premium access for advanced market work.', 'monthly_price' => 79, 'button_label' => 'Choose Pro Desk', 'bullets' => array( 'Everything in Trader', 'Paid video library', 'Priority member support' ) ),
			),
		);
	}

	public static function get_paid_membership_settings() {
		$saved = get_option( self::PAID_MEMBERSHIP_OPTION_NAME, array() );
		return self::normalize_paid_membership( is_array( $saved ) ? $saved : array() );
	}

	private static function normalize_paid_membership( $input ) {
		$defaults = self::get_paid_membership_defaults();
		$settings = $defaults;
		$settings['heading'] = isset( $input['heading'] ) && '' !== trim( (string) $input['heading'] ) ? sanitize_text_field( $input['heading'] ) : $defaults['heading'];
		$settings['message'] = isset( $input['message'] ) && '' !== trim( (string) $input['message'] ) ? sanitize_textarea_field( $input['message'] ) : $defaults['message'];
		$settings['save_percent'] = isset( $input['save_percent'] ) ? min( 100, max( 0, absint( $input['save_percent'] ) ) ) : $defaults['save_percent'];
		$settings['currency'] = isset( $input['currency'] ) && '' !== trim( (string) $input['currency'] ) ? sanitize_text_field( $input['currency'] ) : $defaults['currency'];
		$settings['close_label'] = isset( $input['close_label'] ) ? sanitize_text_field( $input['close_label'] ) : $defaults['close_label'];
		$tiers = isset( $input['tiers'] ) && is_array( $input['tiers'] ) ? $input['tiers'] : array();
		foreach ( $defaults['tiers'] as $index => $fallback ) {
			$tier = isset( $tiers[ $index ] ) && is_array( $tiers[ $index ] ) ? $tiers[ $index ] : array();
			$bullets = isset( $tier['bullets'] ) && is_array( $tier['bullets'] ) ? array_values( array_filter( array_map( 'sanitize_text_field', $tier['bullets'] ), function ( $bullet ) { return '' !== trim( $bullet ); } ) ) : array();
			$settings['tiers'][ $index ] = array(
				'name'          => isset( $tier['name'] ) && '' !== trim( (string) $tier['name'] ) ? sanitize_text_field( $tier['name'] ) : $fallback['name'],
				'description'   => isset( $tier['description'] ) && '' !== trim( (string) $tier['description'] ) ? sanitize_text_field( $tier['description'] ) : $fallback['description'],
				'monthly_price' => isset( $tier['monthly_price'] ) ? max( 0, absint( $tier['monthly_price'] ) ) : $fallback['monthly_price'],
				'button_label'  => isset( $tier['button_label'] ) && '' !== trim( (string) $tier['button_label'] ) ? sanitize_text_field( $tier['button_label'] ) : $fallback['button_label'],
				'bullets'       => ! empty( $bullets ) ? $bullets : array( $fallback['bullets'][0] ),
			);
		}
		return $settings;
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
				<?php self::render_pricing_section( self::get_paid_membership_settings() ); ?>
				<div class="tcn-popup-details__actions"><button type="submit" class="tcn-btn-ghost">Save Popup Details</button></div>
			</form>
		</div>
		<?php
	}

	private static function render_pricing_section( $pricing ) {
		?>
		<section class="tcn-popup-card tcn-pricing-card">
			<div class="tcn-popup-card__header"><h2>Paid Membership Popup</h2><span>Grok Grid pricing</span></div>
			<div class="tcn-pricing-global">
				<p class="tcn-popup-field"><label for="tcnexus-pricing-heading">Main header</label><input id="tcnexus-pricing-heading" name="paid_membership[heading]" value="<?php echo esc_attr( $pricing['heading'] ); ?>" /></p>
				<p class="tcn-popup-field"><label for="tcnexus-pricing-message">Sub text</label><textarea rows="3" id="tcnexus-pricing-message" name="paid_membership[message]"><?php echo esc_textarea( $pricing['message'] ); ?></textarea></p>
				<div class="tcn-pricing-global__row"><p class="tcn-popup-field"><label for="tcnexus-pricing-save">Save percentage</label><input id="tcnexus-pricing-save" type="number" min="0" max="100" name="paid_membership[save_percent]" value="<?php echo esc_attr( $pricing['save_percent'] ); ?>" /></p><p class="tcn-popup-field"><label for="tcnexus-pricing-currency">Currency</label><input id="tcnexus-pricing-currency" name="paid_membership[currency]" value="<?php echo esc_attr( $pricing['currency'] ); ?>" /></p></div>
				<p class="description">Annual prices are calculated automatically from each monthly price and the Save percentage.</p>
			</div>
			<div class="tcn-pricing-tiers">
			<?php foreach ( $pricing['tiers'] as $index => $tier ) : ?>
				<details class="tcn-pricing-tier" <?php echo 0 === $index ? 'open' : ''; ?>><summary><strong>Tier <?php echo esc_html( $index + 1 ); ?> · <?php echo esc_html( $tier['name'] ); ?></strong><span>Visible</span></summary><div class="tcn-pricing-tier__body">
					<p class="tcn-popup-field"><label>Tier name</label><input name="paid_membership[tiers][<?php echo esc_attr( $index ); ?>][name]" value="<?php echo esc_attr( $tier['name'] ); ?>" /></p>
					<p class="tcn-popup-field"><label>Sub text</label><input name="paid_membership[tiers][<?php echo esc_attr( $index ); ?>][description]" value="<?php echo esc_attr( $tier['description'] ); ?>" /></p>
					<div class="tcn-pricing-tier__row"><p class="tcn-popup-field"><label>Monthly price</label><input type="number" min="0" name="paid_membership[tiers][<?php echo esc_attr( $index ); ?>][monthly_price]" value="<?php echo esc_attr( $tier['monthly_price'] ); ?>" /></p><p class="tcn-popup-field"><label>Button text</label><input name="paid_membership[tiers][<?php echo esc_attr( $index ); ?>][button_label]" value="<?php echo esc_attr( $tier['button_label'] ); ?>" /></p></div>
					<div class="tcn-pricing-bullets"><label>Bullet points</label><?php foreach ( $tier['bullets'] as $bullet_index => $bullet ) : ?><div class="tcn-pricing-bullet"><input name="paid_membership[tiers][<?php echo esc_attr( $index ); ?>][bullets][]" value="<?php echo esc_attr( $bullet ); ?>" /><button type="button" class="tcn-pricing-bullet__remove" aria-label="Remove bullet">−</button></div><?php endforeach; ?><button type="button" class="tcn-pricing-bullet__add">+ Add bullet point</button></div>
				</div></details>
			<?php endforeach; ?>
			</div>
		</section>
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
		if ( isset( $input['paid_membership'] ) && is_array( $input['paid_membership'] ) ) {
			update_option( self::PAID_MEMBERSHIP_OPTION_NAME, self::normalize_paid_membership( $input['paid_membership'] ) );
		}
		wp_safe_redirect( admin_url( 'admin.php?page=tcnexus-registration-settings&saved=1' ) );
		exit;
	}
}
