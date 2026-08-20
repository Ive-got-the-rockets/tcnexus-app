<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Backs the custom image cropper in the Course Builder / Instructor Builder
 * media pickers. WordPress's own built-in cropper (the one behind Site Icon/
 * Custom Header in the Customizer) lives entirely in undocumented Backbone
 * view/controller wiring that's awkward and fragile to drive from outside
 * the Customizer, so this reimplements just the save step — calling the same
 * public wp_crop_image() core function WordPress itself uses — behind a
 * small ajax action, while the crop-selection UI is our own DOM/JS.
 */
class TCNexus_Media {

	const NONCE_ACTION = 'tcnexus_crop_image';

	/**
	 * Hands the cropper's ajax URL + nonce to an already-enqueued script.
	 * Called from both Course Builder and Instructor Builder's own
	 * enqueue_assets(), since they each enqueue the same shared script.
	 */
	public static function localize( $handle ) {
		wp_localize_script( $handle, 'tcnexusMedia', array(
			'ajaxUrl'           => admin_url( 'admin-ajax.php' ),
			'nonce'             => wp_create_nonce( self::NONCE_ACTION ),
			'quickCreateNonce'  => wp_create_nonce( TCNexus_Instructor_Builder::QUICK_CREATE_NONCE_ACTION ),
		) );
	}

	/**
	 * Shared media-picker markup for Course Builder and Instructor Builder —
	 * one implementation so every image field looks and behaves the same.
	 * $crop_width/$crop_height, when given, both state the recommended
	 * upload size in the empty-state placeholder and set the target aspect
	 * ratio the cropper (in course-builder.js) constrains selection to.
	 */
	public static function render_picker( $label, $field_key, $attachment_id, $title, $crop_width = 0, $crop_height = 0 ) {
		$input_id = 'tcn-media-' . $field_key;
		$url      = $attachment_id ? wp_get_attachment_image_url( $attachment_id, 'medium' ) : '';
		$has_crop = $crop_width && $crop_height;
		?>
		<div
			class="tcn-media-picker"
			data-input-id="<?php echo esc_attr( $input_id ); ?>"
			data-title="<?php echo esc_attr( $title ); ?>"
			<?php if ( $has_crop ) : ?>
				data-crop-width="<?php echo esc_attr( $crop_width ); ?>"
				data-crop-height="<?php echo esc_attr( $crop_height ); ?>"
			<?php endif; ?>
		>
			<div class="tcn-media-picker__preview">
				<?php if ( $url ) : ?>
					<img src="<?php echo esc_url( $url ); ?>" alt="" />
				<?php else : ?>
					<span class="tcn-media-picker__empty">
						No image selected
						<?php if ( $has_crop ) : ?>
							<br />Recommended size: <?php echo (int) $crop_width; ?> &times; <?php echo (int) $crop_height; ?>px
						<?php endif; ?>
						<br />Drop image here
					</span>
				<?php endif; ?>
			</div>
			<input type="hidden" id="<?php echo esc_attr( $input_id ); ?>" name="<?php echo esc_attr( $field_key ); ?>" value="<?php echo esc_attr( $attachment_id ); ?>" />
			<div class="tcn-media-picker__actions">
				<button type="button" class="tcn-btn-ghost tcn-media-select"><?php echo esc_html( $label ); ?></button>
				<button type="button" class="tcn-btn-ghost tcn-btn-ghost--danger tcn-media-remove">Remove</button>
			</div>
		</div>
		<?php
	}

	public static function ajax_crop_image() {
		check_ajax_referer( self::NONCE_ACTION, 'nonce' );

		$attachment_id = isset( $_POST['attachment_id'] ) ? absint( $_POST['attachment_id'] ) : 0;

		if ( ! $attachment_id || ! current_user_can( 'edit_post', $attachment_id ) ) {
			wp_send_json_error( array( 'message' => 'Invalid attachment.' ) );
		}

		$x          = isset( $_POST['x'] ) ? absint( $_POST['x'] ) : 0;
		$y          = isset( $_POST['y'] ) ? absint( $_POST['y'] ) : 0;
		$width      = isset( $_POST['width'] ) ? absint( $_POST['width'] ) : 0;
		$height     = isset( $_POST['height'] ) ? absint( $_POST['height'] ) : 0;
		$dst_width  = isset( $_POST['dst_width'] ) ? absint( $_POST['dst_width'] ) : $width;
		$dst_height = isset( $_POST['dst_height'] ) ? absint( $_POST['dst_height'] ) : $height;

		if ( ! $width || ! $height ) {
			wp_send_json_error( array( 'message' => 'Invalid crop dimensions.' ) );
		}

		$cropped = wp_crop_image( $attachment_id, $x, $y, $width, $height, $dst_width, $dst_height );

		if ( ! $cropped || is_wp_error( $cropped ) ) {
			wp_send_json_error( array( 'message' => 'Image could not be cropped.' ) );
		}

		/** This filter is documented in wp-admin/includes/class-custom-image-header.php */
		$cropped = apply_filters( 'wp_create_file_in_uploads', $cropped, $attachment_id );

		$attachment    = wp_copy_parent_attachment_properties( $cropped, $attachment_id, 'tcnexus-crop' );
		$new_id        = wp_insert_attachment( $attachment, $cropped );
		$metadata      = wp_generate_attachment_metadata( $new_id, $cropped );
		wp_update_attachment_metadata( $new_id, $metadata );

		wp_send_json_success( array(
			'id'  => $new_id,
			'url' => wp_get_attachment_image_url( $new_id, 'medium' ),
		) );
	}
}
