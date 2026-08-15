<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_Meta_Boxes {

	public static function register() {
		add_meta_box(
			'tcnexus_lesson_details',
			'Episode Details',
			array( __CLASS__, 'render' ),
			'tc_lesson',
			'side',
			'high'
		);
	}

	public static function render( $post ) {
		wp_nonce_field( 'tcnexus_lesson_details', 'tcnexus_lesson_details_nonce' );

		$course_id = get_post_meta( $post->ID, '_tcnexus_course_id', true );
		$vimeo_id  = get_post_meta( $post->ID, '_tcnexus_vimeo_id', true );
		$tier      = TCNexus_Post_Types::get_lesson_tier( $post->ID );

		$courses = get_posts( array(
			'post_type'      => 'tc_course',
			'posts_per_page' => -1,
			'orderby'        => 'title',
			'order'          => 'ASC',
		) );
		?>
		<p>
			<label for="tcnexus_course_id"><strong>Course</strong></label><br />
			<select name="tcnexus_course_id" id="tcnexus_course_id" style="width:100%;">
				<option value="">— Select a course —</option>
				<?php foreach ( $courses as $course ) : ?>
					<option value="<?php echo esc_attr( $course->ID ); ?>" <?php selected( $course_id, $course->ID ); ?>>
						<?php echo esc_html( $course->post_title ); ?>
					</option>
				<?php endforeach; ?>
			</select>
		</p>
		<p>
			<label for="tcnexus_vimeo_id"><strong>Vimeo Video ID</strong></label><br />
			<input type="text" name="tcnexus_vimeo_id" id="tcnexus_vimeo_id" value="<?php echo esc_attr( $vimeo_id ); ?>" style="width:100%;" placeholder="e.g. 824804226" />
		</p>
		<p>
			<strong>Access Tier</strong><br />
			<?php foreach ( array( 'free' => 'Free', 'registered' => 'Registered', 'paid' => 'Paid' ) as $slug => $label ) : ?>
				<label style="display:block;margin-top:4px;">
					<input type="radio" name="tcnexus_access_tier" value="<?php echo esc_attr( $slug ); ?>" <?php checked( $tier, $slug ); ?> />
					<?php echo esc_html( $label ); ?>
				</label>
			<?php endforeach; ?>
		</p>
		<p>
			<label for="tcnexus_lesson_order"><strong>Order within course</strong></label><br />
			<input type="number" name="menu_order" id="tcnexus_lesson_order" value="<?php echo esc_attr( $post->menu_order ); ?>" style="width:100%;" min="0" />
		</p>
		<?php
	}

	public static function save( $post_id ) {
		if ( ! isset( $_POST['tcnexus_lesson_details_nonce'] ) ||
			! wp_verify_nonce( $_POST['tcnexus_lesson_details_nonce'], 'tcnexus_lesson_details' ) ) {
			return;
		}
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		if ( isset( $_POST['tcnexus_course_id'] ) ) {
			update_post_meta( $post_id, '_tcnexus_course_id', absint( $_POST['tcnexus_course_id'] ) );
		}
		if ( isset( $_POST['tcnexus_vimeo_id'] ) ) {
			update_post_meta( $post_id, '_tcnexus_vimeo_id', sanitize_text_field( $_POST['tcnexus_vimeo_id'] ) );
		}
		if ( isset( $_POST['tcnexus_access_tier'] ) ) {
			TCNexus_Post_Types::set_lesson_tier( $post_id, sanitize_key( $_POST['tcnexus_access_tier'] ) );
		}
	}
}
