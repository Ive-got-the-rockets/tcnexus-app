<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_Animations_Settings {
	const OPTION_NAME = 'tcnexus_card_animation_settings';

	public static function register() {
		add_menu_page(
			'Animations',
			'Animations',
			'list_users',
			'tcnexus-animations',
			array( __CLASS__, 'render_page' ),
			'dashicons-format-video',
			27
		);
		add_submenu_page(
			'tcnexus-animations',
			'Card Carousel Animation',
			'Card Carousel Animation',
			'list_users',
			'tcnexus-card-carousel-animation',
			array( __CLASS__, 'render_page' )
		);
	}

	public static function get_defaults() {
		return array(
			'active_preset' => 'preset-01',
			'presets'       => array(
				array(
					'id'     => 'preset-01',
					'name'   => 'Preset 01',
					'open'   => 0.50,
					'switch' => 0.50,
					'close'  => 0.50,
				),
			),
		);
	}

	public static function get_settings() {
		$saved = get_option( self::OPTION_NAME, array() );
		return self::normalize( is_array( $saved ) ? $saved : array() );
	}

	public static function get_active_preset() {
		$settings = self::get_settings();
		foreach ( $settings['presets'] as $preset ) {
			if ( $preset['id'] === $settings['active_preset'] ) {
				return $preset;
			}
		}
		return $settings['presets'][0];
	}

	private static function normalize( $value ) {
		$defaults = self::get_defaults();
		$raw_presets = isset( $value['presets'] ) && is_array( $value['presets'] ) ? $value['presets'] : array();
		$presets = array();
		$ids = array();

		foreach ( $raw_presets as $index => $raw ) {
			if ( ! is_array( $raw ) ) {
				continue;
			}
			$fallback = $defaults['presets'][0];
			$id = isset( $raw['id'] ) ? sanitize_key( $raw['id'] ) : '';
			if ( '' === $id || isset( $ids[ $id ] ) ) {
				$id = 'preset-' . ( count( $presets ) + 1 );
			}
			$name = isset( $raw['name'] ) ? sanitize_text_field( $raw['name'] ) : '';
			$presets[] = array(
				'id'     => $id,
				'name'   => '' !== trim( $name ) ? trim( $name ) : ( 0 === $index ? $fallback['name'] : 'Preset ' . ( count( $presets ) + 1 ) ),
				'open'   => self::normalize_duration( isset( $raw['open'] ) ? $raw['open'] : $fallback['open'], $fallback['open'] ),
				'switch' => self::normalize_duration( isset( $raw['switch'] ) ? $raw['switch'] : $fallback['switch'], $fallback['switch'] ),
				'close'  => self::normalize_duration( isset( $raw['close'] ) ? $raw['close'] : $fallback['close'], $fallback['close'] ),
			);
			$ids[ $id ] = true;
		}

		if ( empty( $presets ) ) {
			$presets = $defaults['presets'];
		}
		$active = isset( $value['active_preset'] ) ? sanitize_key( $value['active_preset'] ) : $presets[0]['id'];
		$known_ids = wp_list_pluck( $presets, 'id' );
		if ( ! in_array( $active, $known_ids, true ) ) {
			$active = $presets[0]['id'];
		}
		return array( 'active_preset' => $active, 'presets' => $presets );
	}

	private static function normalize_duration( $value, $fallback ) {
		$number = is_numeric( $value ) ? (float) $value : (float) $fallback;
		$number = min( 2.00, max( 0.10, $number ) );
		return round( $number, 2 );
	}

	public static function render_page() {
		if ( ! current_user_can( 'list_users' ) ) {
			return;
		}
		$settings = self::get_settings();
		$selected_id = isset( $_GET['preset'] ) ? sanitize_key( $_GET['preset'] ) : $settings['active_preset'];
		$selected = self::get_active_preset();
		foreach ( $settings['presets'] as $preset ) {
			if ( $preset['id'] === $selected_id ) {
				$selected = $preset;
				break;
			}
		}
		?>
		<div class="wrap tcn-membership-wrap tcn-animation-wrap">
			<div class="tcn-membership-header">
				<div>
					<p class="tcn-membership-eyebrow">Animations</p>
					<h1>Card Carousel Animation</h1>
					<p class="tcn-membership-subtitle">Control how course previews open, switch, and close on the main page.</p>
				</div>
			</div>
			<?php if ( isset( $_GET['saved'] ) ) : ?>
				<div class="notice notice-success is-dismissible"><p>Animation preset saved.</p></div>
			<?php endif; ?>
			<section class="tcn-animation-panel">
				<div class="tcn-animation-panel__header">
					<div><p class="tcn-membership-eyebrow">Card Animations</p><h2>Timing preset</h2></div>
					<form method="get" class="tcn-animation-preset-picker">
						<input type="hidden" name="page" value="tcnexus-card-carousel-animation" />
						<label for="tcn-animation-preset">Active preset</label>
						<select id="tcn-animation-preset" name="preset" onchange="this.form.submit()">
							<?php foreach ( $settings['presets'] as $preset ) : ?>
								<option value="<?php echo esc_attr( $preset['id'] ); ?>" <?php selected( $selected['id'], $preset['id'] ); ?>><?php echo esc_html( $preset['name'] ); ?><?php echo $settings['active_preset'] === $preset['id'] ? ' · Current' : ''; ?></option>
							<?php endforeach; ?>
						</select>
					</form>
				</div>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="tcnexus_save_card_animation_settings" />
					<input type="hidden" name="preset_id" value="<?php echo esc_attr( $selected['id'] ); ?>" />
					<?php wp_nonce_field( 'tcnexus_save_card_animation_settings' ); ?>
					<div class="tcn-animation-fields">
						<?php self::render_duration_field( 'open', 'Open speed', 'Preview entrance', $selected['open'] ); ?>
						<?php self::render_duration_field( 'switch', 'Switch speed', 'Move between cards', $selected['switch'] ); ?>
						<?php self::render_duration_field( 'close', 'Close speed', 'Preview exit', $selected['close'] ); ?>
					</div>
					<div class="tcn-animation-preview"><p class="tcn-animation-preview__label">Live preview</p><div class="tcn-animation-preview__stage"><div class="tcn-animation-preview__card"><span></span><h3>Course preview</h3><p>These timings control the preview motion on the main page.</p></div></div></div>
					<div class="tcn-animation-actions">
						<div><label for="tcn-animation-preset-name">Preset name</label><input id="tcn-animation-preset-name" name="preset_name" value="<?php echo esc_attr( $selected['name'] ); ?>" /></div>
						<div class="tcn-animation-actions__buttons"><button type="submit" name="mode" value="save_as" class="tcn-btn-ghost">Save as preset</button><button type="submit" name="mode" value="save" class="tcn-btn-primary">Save changes</button></div>
					</div>
				</form>
			</section>
		</div>
		<?php
	}

	private static function render_duration_field( $key, $label, $description, $value ) {
		?>
		<div class="tcn-animation-field"><label for="tcn-animation-<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $label ); ?></label><div class="tcn-animation-field__input"><input id="tcn-animation-<?php echo esc_attr( $key ); ?>" type="number" min="0.10" max="2.00" step="0.01" name="<?php echo esc_attr( $key ); ?>" value="<?php echo esc_attr( number_format( (float) $value, 2, '.', '' ) ); ?>" /><span>seconds</span></div><p><?php echo esc_html( $description ); ?></p></div>
		<?php
	}

	public static function handle_save() {
		if ( ! current_user_can( 'list_users' ) || ! isset( $_POST['_wpnonce'] ) || ! wp_verify_nonce( $_POST['_wpnonce'], 'tcnexus_save_card_animation_settings' ) ) {
			wp_die( 'Invalid request.' );
		}
		$settings = self::get_settings();
		$mode = isset( $_POST['mode'] ) ? sanitize_key( $_POST['mode'] ) : 'save';
		$preset_id = isset( $_POST['preset_id'] ) ? sanitize_key( $_POST['preset_id'] ) : $settings['active_preset'];
		$preset_name = isset( $_POST['preset_name'] ) ? sanitize_text_field( $_POST['preset_name'] ) : 'Preset 01';
		$preset = array(
			'id'     => $preset_id,
			'name'   => trim( $preset_name ) ?: 'Preset 01',
			'open'   => isset( $_POST['open'] ) ? $_POST['open'] : 0.50,
			'switch' => isset( $_POST['switch'] ) ? $_POST['switch'] : 0.50,
			'close'  => isset( $_POST['close'] ) ? $_POST['close'] : 0.50,
		);
		$preset = self::normalize( array( 'active_preset' => $preset_id, 'presets' => array( $preset ) ) )['presets'][0];
		if ( 'save_as' === $mode ) {
			$preset['id'] = sanitize_key( $preset['name'] );
			if ( '' === $preset['id'] || 'preset-01' === $preset['id'] ) {
				$preset['id'] = 'preset-' . ( count( $settings['presets'] ) + 1 );
			}
			$existing_ids = wp_list_pluck( $settings['presets'], 'id' );
			$base_id = $preset['id'];
			$suffix = 2;
			while ( in_array( $preset['id'], $existing_ids, true ) ) {
				$preset['id'] = $base_id . '-' . $suffix;
				$suffix++;
			}
			$settings['presets'][] = $preset;
			$settings['active_preset'] = $preset['id'];
		} else {
			foreach ( $settings['presets'] as $index => $existing ) {
				if ( $existing['id'] === $preset_id ) {
					$settings['presets'][ $index ] = $preset;
					$settings['active_preset'] = $preset_id;
				}
			}
		}
		update_option( self::OPTION_NAME, self::normalize( $settings ) );
		wp_safe_redirect( admin_url( 'admin.php?page=tcnexus-card-carousel-animation&saved=1' ) );
		exit;
	}
}
