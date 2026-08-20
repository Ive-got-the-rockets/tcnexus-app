<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * A single table of every lesson across every course, filterable by
 * Instructor and Course, so lessons don't have to be found one course at a
 * time. Each row expands into the same image + fields editor the per-course
 * Lessons card uses (see TCNexus_Course_Builder) — but since rows here can
 * belong to any course, Save/Remove act on one lesson at a time over ajax
 * instead of one big course-scoped form submit.
 */
class TCNexus_Global_Lessons {

	const PAGE_SLUG           = 'tcnexus-global-lessons';
	const SAVE_NONCE_ACTION   = 'tcnexus_save_global_lesson';
	const DELETE_NONCE_ACTION = 'tcnexus_delete_global_lesson';

	private static $hook_suffix;

	public static function register() {
		self::$hook_suffix = add_menu_page(
			'Global Lessons List',
			'Global Lessons',
			'edit_posts',
			self::PAGE_SLUG,
			array( __CLASS__, 'render' ),
			'dashicons-playlist-video',
			21
		);
	}

	public static function enqueue_assets( $hook ) {
		if ( $hook !== self::$hook_suffix ) {
			return;
		}

		wp_enqueue_media();

		wp_enqueue_style(
			'tcnexus-builder-fonts',
			'https://fonts.googleapis.com/css2?family=Fraunces:wght@300;400;500;600;700;900&family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap',
			array(),
			null
		);

		// Shares Course Builder's stylesheet/script — same design system,
		// same custom-select/media-picker/lessons-list machinery (see the
		// window.TCNexusBuilder exposure at the bottom of course-builder.js).
		wp_enqueue_style(
			'tcnexus-course-builder',
			TCNEXUS_LMS_URL . 'assets/course-builder.css',
			array(),
			TCNEXUS_LMS_VERSION
		);
		wp_enqueue_style(
			'tcnexus-global-lessons',
			TCNEXUS_LMS_URL . 'assets/global-lessons.css',
			array( 'tcnexus-course-builder' ),
			TCNEXUS_LMS_VERSION
		);

		wp_enqueue_script(
			'tcnexus-course-builder',
			TCNEXUS_LMS_URL . 'assets/course-builder.js',
			array(),
			TCNEXUS_LMS_VERSION,
			true
		);
		wp_enqueue_script(
			'tcnexus-global-lessons',
			TCNEXUS_LMS_URL . 'assets/global-lessons.js',
			array( 'tcnexus-course-builder' ),
			TCNEXUS_LMS_VERSION,
			true
		);

		TCNexus_Media::localize( 'tcnexus-course-builder' );

		wp_localize_script( 'tcnexus-global-lessons', 'tcnexusGlobalLessons', array(
			'ajaxUrl'      => admin_url( 'admin-ajax.php' ),
			'saveNonce'    => wp_create_nonce( self::SAVE_NONCE_ACTION ),
			'deleteNonce'  => wp_create_nonce( self::DELETE_NONCE_ACTION ),
		) );
	}

	public static function render() {
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( 'You do not have permission to access this page.' );
		}

		$courses = get_posts( array(
			'post_type'      => 'tc_course',
			'posts_per_page' => -1,
			'post_status'    => array( 'publish', 'draft' ),
			'orderby'        => 'title',
			'order'          => 'ASC',
		) );

		$course_map = array();
		foreach ( $courses as $course ) {
			$course_map[ $course->ID ] = array(
				'title'         => $course->post_title ?: 'Untitled Course',
				'instructor_id' => (int) get_post_meta( $course->ID, '_tcnexus_instructor_id', true ),
			);
		}

		$all_people  = get_posts( array(
			'post_type'      => 'tc_instructor',
			'posts_per_page' => -1,
			'post_status'    => array( 'publish', 'draft' ),
			'orderby'        => 'title',
			'order'          => 'ASC',
		) );
		$instructors = array_values( array_filter( $all_people, function ( $person ) {
			return 'instructor' === TCNexus_Post_Types::get_person_role( $person->ID );
		} ) );

		$lessons = get_posts( array(
			'post_type'      => 'tc_lesson',
			'posts_per_page' => -1,
			'post_status'    => array( 'publish', 'draft' ),
		) );

		usort( $lessons, function ( $a, $b ) use ( $course_map ) {
			$a_course_id = (int) get_post_meta( $a->ID, '_tcnexus_course_id', true );
			$b_course_id = (int) get_post_meta( $b->ID, '_tcnexus_course_id', true );
			$cmp         = strcasecmp(
				$course_map[ $a_course_id ]['title'] ?? '',
				$course_map[ $b_course_id ]['title'] ?? ''
			);
			return 0 !== $cmp ? $cmp : ( $a->menu_order <=> $b->menu_order );
		} );

		$lesson_views = TCNexus_Access_Control::count_views_for_lessons( wp_list_pluck( $lessons, 'ID' ) );
		?>
		<div class="wrap tcn-builder-wrap tcn-global-lessons-wrap">
			<h1 class="tcn-global-lessons-title">Global Lessons List</h1>

			<div class="tcn-filter-bar">
				<div class="tcn-filter-field">
					<label class="tcn-field__label" for="tcn-filter-instructor">Instructor</label>
					<select id="tcn-filter-instructor" class="tcn-select">
						<option value="">All Instructors</option>
						<?php foreach ( $instructors as $person ) : ?>
							<option value="<?php echo esc_attr( $person->ID ); ?>"><?php echo esc_html( $person->post_title ); ?></option>
						<?php endforeach; ?>
					</select>
				</div>
				<div class="tcn-filter-field">
					<label class="tcn-field__label" for="tcn-filter-course">Course</label>
					<select id="tcn-filter-course" class="tcn-select">
						<option value="">All Courses</option>
						<?php foreach ( $courses as $course ) : ?>
							<option value="<?php echo esc_attr( $course->ID ); ?>"><?php echo esc_html( $course_map[ $course->ID ]['title'] ); ?></option>
						<?php endforeach; ?>
					</select>
				</div>
				<span class="tcn-filter-count" id="tcn-filter-count"></span>
				<button type="button" class="tcn-btn-ghost tcn-filter-clear" id="tcn-filter-clear">Clear filters</button>
			</div>

			<div class="tcn-lessons-card">
				<div class="tcn-lessons-card__header">
					<h2 class="tcn-lessons-card__title">Lessons</h2>
				</div>

				<table class="tcn-lessons-overview">
					<thead>
						<tr>
							<th class="tcn-lessons-overview__order">Lesson No.</th>
							<th>Title</th>
							<th class="tcn-lessons-overview__course">Course</th>
							<th class="tcn-lessons-overview__level">Tier</th>
							<th class="tcn-lessons-overview__duration">Duration</th>
							<th class="tcn-lessons-overview__views">Views</th>
						</tr>
					</thead>
					<tbody id="tcnexus-global-lessons-list">
						<?php if ( empty( $lessons ) ) : ?>
							<tr class="tcn-lessons-empty-row">
								<td colspan="6">No lessons yet — add lessons from a course's own Lessons card.</td>
							</tr>
						<?php else : ?>
							<?php foreach ( $lessons as $index => $lesson ) :
								$course_id          = (int) get_post_meta( $lesson->ID, '_tcnexus_course_id', true );
								$course_info        = $course_map[ $course_id ] ?? array( 'title' => 'Unknown Course', 'instructor_id' => 0 );
								$tier               = TCNexus_Post_Types::get_lesson_tier( $lesson->ID );
								$video_id           = get_post_meta( $lesson->ID, '_tcnexus_vimeo_id', true );
								$video_source       = get_post_meta( $lesson->ID, '_tcnexus_video_source', true ) ?: 'vimeo';
								$duration           = get_post_meta( $lesson->ID, '_tcnexus_duration', true );
								$thumbnail_id       = get_post_thumbnail_id( $lesson->ID );
								$video_placeholder  = 'youtube' === $video_source ? 'YouTube Video ID' : 'Vimeo Video ID';
								$views              = isset( $lesson_views[ $lesson->ID ] ) ? $lesson_views[ $lesson->ID ] : 0;
							?>
								<tr class="tcn-lesson-row" data-lesson-id="<?php echo esc_attr( $lesson->ID ); ?>" data-course-id="<?php echo esc_attr( $course_id ); ?>" data-instructor-id="<?php echo esc_attr( $course_info['instructor_id'] ); ?>">
									<td class="tcn-lessons-overview__order"><?php echo esc_html( sprintf( '%02d', $lesson->menu_order ?: ( $index + 1 ) ) ); ?></td>
									<td>
										<div class="tcn-lesson-row__title">
											<svg class="tcn-lesson-row__chevron" width="16" height="16" viewBox="0 0 24 24"><polygon points="8,5 8,19 18,12" fill="#E5E3DB" /></svg>
											<span><?php echo esc_html( $lesson->post_title ); ?></span>
										</div>
									</td>
									<td class="tcn-lessons-overview__course"><?php echo esc_html( $course_info['title'] ); ?></td>
									<td class="tcn-lessons-overview__level"><span class="tcn-level-chip tcn-level-chip--<?php echo esc_attr( $tier ); ?>"><?php echo esc_html( ucfirst( $tier ) ); ?></span></td>
									<td class="tcn-lessons-overview__duration"><?php echo esc_html( $duration ?: '—' ); ?></td>
									<td class="tcn-lessons-overview__views"><?php echo esc_html( number_format_i18n( $views ) ); ?></td>
								</tr>
								<tr class="tcn-lesson-expand">
									<td colspan="6">
										<div class="tcn-lesson-expand__panel">
											<div class="tcn-lesson-card">
												<div class="tcn-lesson-card__media">
													<?php TCNexus_Media::render_picker( 'Select Image', "global_lesson_thumbnail_{$lesson->ID}", $thumbnail_id, 'Select episode image', 640, 360 ); ?>
												</div>
												<div class="tcn-lesson-card__body">
													<div class="tcn-lesson-card__row tcn-lesson-card__row--top">
														<div class="tcn-lesson-card__order">
															<label class="tcn-field__label">Order</label>
															<select class="tcn-select">
																<?php for ( $i = 1; $i <= 100; $i++ ) : ?>
																	<option value="<?php echo esc_attr( $i ); ?>" <?php selected( (int) ( $lesson->menu_order ?: ( $index + 1 ) ), $i ); ?>><?php echo esc_html( sprintf( '%02d', $i ) ); ?></option>
																<?php endfor; ?>
															</select>
														</div>
														<div class="tcn-lesson-card__title">
															<label class="tcn-field__label">Title</label>
															<input type="text" value="<?php echo esc_attr( $lesson->post_title ); ?>" />
														</div>
													</div>
													<div class="tcn-lesson-card__row tcn-lesson-card__row--video">
														<div class="tcn-pill-toggle">
															<input type="radio" id="gl_video_source_<?php echo esc_attr( $lesson->ID ); ?>_vimeo" name="gl_video_source_<?php echo esc_attr( $lesson->ID ); ?>" value="vimeo" <?php checked( $video_source, 'vimeo' ); ?> />
															<label for="gl_video_source_<?php echo esc_attr( $lesson->ID ); ?>_vimeo">Vimeo</label>
															<input type="radio" id="gl_video_source_<?php echo esc_attr( $lesson->ID ); ?>_youtube" name="gl_video_source_<?php echo esc_attr( $lesson->ID ); ?>" value="youtube" <?php checked( $video_source, 'youtube' ); ?> />
															<label for="gl_video_source_<?php echo esc_attr( $lesson->ID ); ?>_youtube">YouTube</label>
														</div>
														<input type="text" class="tcn-video-id-input" value="<?php echo esc_attr( $video_id ); ?>" placeholder="<?php echo esc_attr( $video_placeholder ); ?>" />
													</div>
													<div class="tcn-lesson-card__row tcn-lesson-card__row--meta">
														<div class="tcn-lesson-card__duration">
															<label class="tcn-field__label">Duration</label>
															<input type="text" class="tcn-duration-input" value="<?php echo esc_attr( $duration ); ?>" placeholder="e.g. 12:45" />
														</div>
														<div class="tcn-lesson-card__tier">
															<label class="tcn-field__label">Tier</label>
															<div class="tcn-pill-toggle">
																<input type="radio" id="gl_tier_<?php echo esc_attr( $lesson->ID ); ?>_free" name="gl_tier_<?php echo esc_attr( $lesson->ID ); ?>" value="free" <?php checked( $tier, 'free' ); ?> />
																<label for="gl_tier_<?php echo esc_attr( $lesson->ID ); ?>_free">Free</label>
																<input type="radio" id="gl_tier_<?php echo esc_attr( $lesson->ID ); ?>_paid" name="gl_tier_<?php echo esc_attr( $lesson->ID ); ?>" value="paid" <?php checked( $tier, 'paid' ); ?> />
																<label for="gl_tier_<?php echo esc_attr( $lesson->ID ); ?>_paid">Paid</label>
															</div>
														</div>
													</div>
													<div class="tcn-lesson-card__footer">
														<button type="button" class="tcn-btn-ghost tcn-btn-ghost--danger tcn-global-lesson-remove">Remove</button>
														<button type="button" class="tcn-save-btn tcn-global-lesson-save">Save</button>
													</div>
												</div>
											</div>
										</div>
									</td>
								</tr>
							<?php endforeach; ?>
						<?php endif; ?>
					</tbody>
				</table>
			</div>

			<div class="tcn-modal-backdrop" id="tcn-global-lesson-delete-modal">
				<div class="tcn-modal" role="alertdialog" aria-modal="true" aria-labelledby="tcn-global-lesson-delete-title">
					<h2 id="tcn-global-lesson-delete-title">Delete lesson?</h2>
					<p id="tcn-global-lesson-delete-message">Are you sure you want to delete this lesson?</p>
					<div class="tcn-modal__actions">
						<button type="button" class="tcn-btn-ghost" id="tcn-global-lesson-delete-cancel">Cancel</button>
						<button type="button" class="tcn-btn-danger" id="tcn-global-lesson-delete-confirm">Delete</button>
					</div>
				</div>
			</div>
		</div>
		<?php
	}

	public static function ajax_save_lesson() {
		check_ajax_referer( self::SAVE_NONCE_ACTION, 'nonce' );

		$lesson_id = isset( $_POST['lesson_id'] ) ? absint( $_POST['lesson_id'] ) : 0;
		if ( ! $lesson_id || 'tc_lesson' !== get_post_type( $lesson_id ) || ! current_user_can( 'edit_post', $lesson_id ) ) {
			wp_send_json_error( array( 'message' => 'Invalid lesson.' ) );
		}

		TCNexus_Course_Builder::persist_lesson_fields( $lesson_id, $_POST );

		wp_send_json_success( array(
			'title'    => get_the_title( $lesson_id ),
			'order'    => (int) get_post( $lesson_id )->menu_order,
			'tier'     => TCNexus_Post_Types::get_lesson_tier( $lesson_id ),
			'duration' => get_post_meta( $lesson_id, '_tcnexus_duration', true ),
		) );
	}

	public static function ajax_delete_lesson() {
		check_ajax_referer( self::DELETE_NONCE_ACTION, 'nonce' );

		$lesson_id = isset( $_POST['lesson_id'] ) ? absint( $_POST['lesson_id'] ) : 0;
		if ( ! $lesson_id || 'tc_lesson' !== get_post_type( $lesson_id ) || ! current_user_can( 'delete_post', $lesson_id ) ) {
			wp_send_json_error( array( 'message' => 'Invalid lesson.' ) );
		}

		wp_trash_post( $lesson_id );

		wp_send_json_success();
	}
}
