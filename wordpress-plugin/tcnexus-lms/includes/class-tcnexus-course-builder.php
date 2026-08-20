<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * A single admin page for building a course: everything about it — basics,
 * media, people, links, and its full lesson list — in one tabbed form,
 * instead of the native flow of editing a course post and then separately
 * creating and linking each lesson post one at a time.
 */
class TCNexus_Course_Builder {

	const PAGE_SLUG = 'tcnexus-course-builder';

	const LEVELS = array(
		'beginner'     => 'Beginner',
		'intermediate' => 'Intermediate',
		'advanced'     => 'Advanced',
	);

	const LANGUAGES = array(
		'en' => 'English',
		'es' => 'Spanish',
		'pt' => 'Portuguese',
		'fr' => 'French',
		'de' => 'German',
		'other' => 'Other',
	);

	private static $hook_suffix;

	public static function register() {
		// Registered with a null parent so it's a real, addressable admin
		// page (WordPress tracks it, capability-checks it, fires load-{hook}
		// for it) without appearing under any menu — adding it under
		// edit.php?post_type=tc_course and then remove_submenu_page()-ing it
		// looks equivalent but isn't: WordPress resolves a page's "parent" by
		// searching that same submenu list at request time, so a removed
		// entry resolves to a different parent than it was registered with
		// and access gets denied ("Sorry, you are not allowed to access this
		// page.") even for a user who can otherwise edit courses fine.
		self::$hook_suffix = add_submenu_page(
			null,
			'Course Builder',
			'Course Builder',
			'edit_posts',
			self::PAGE_SLUG,
			array( __CLASS__, 'render' )
		);

		// Reached through WordPress's own "All Courses" / "Add New Course"
		// menu items (redirected below) instead of a separate menu entry.

		// `load-{hook}` fires before any admin HTML is output, unlike the
		// page callback itself — redirects here are safe; a redirect from
		// inside render() breaks with "headers already sent" because
		// admin.php has already printed the page chrome by the time it
		// calls the page callback.
		add_action( 'load-' . self::$hook_suffix, array( __CLASS__, 'maybe_create_course' ) );
		add_action( 'load-' . self::$hook_suffix, array( __CLASS__, 'set_page_title' ) );
		add_action( 'load-edit.php', array( __CLASS__, 'redirect_course_list' ) );
		add_action( 'load-post-new.php', array( __CLASS__, 'redirect_course_new' ) );
		add_action( 'load-post.php', array( __CLASS__, 'redirect_course_edit' ) );
	}

	/**
	 * WordPress derives the admin page title (used in admin-header.php,
	 * including a `strip_tags( $title )` call) by searching the same
	 * $submenu structure get_admin_page_parent() uses — which our
	 * intentionally-parentless page isn't part of, so it's left null and
	 * trips a "Passing null to strip_tags()" deprecation notice. Setting it
	 * directly, before admin-header.php runs, sidesteps that lookup entirely.
	 */
	public static function set_page_title() {
		global $title;
		$title = 'Course Builder';
	}

	public static function maybe_create_course() {
		if ( ! isset( $_GET['new'] ) || '1' !== $_GET['new'] ) {
			return;
		}
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( 'You do not have permission to access this page.' );
		}

		$new_id = wp_insert_post( array(
			'post_type'   => 'tc_course',
			'post_title'  => 'Untitled Course',
			'post_status' => 'draft',
		) );
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&course_id=' . $new_id ) );
		exit;
	}

	public static function redirect_course_list() {
		if ( isset( $_GET['post_type'] ) && 'tc_course' === $_GET['post_type'] ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG ) );
			exit;
		}
	}

	public static function redirect_course_new() {
		if ( isset( $_GET['post_type'] ) && 'tc_course' === $_GET['post_type'] ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&new=1' ) );
			exit;
		}
	}

	public static function redirect_course_edit() {
		$action = isset( $_GET['action'] ) ? $_GET['action'] : 'edit';
		if ( 'edit' !== $action || empty( $_GET['post'] ) ) {
			return;
		}

		$post_id = absint( $_GET['post'] );
		if ( 'tc_course' === get_post_type( $post_id ) ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&course_id=' . $post_id ) );
			exit;
		}
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

		wp_enqueue_style(
			'tcnexus-course-builder',
			TCNEXUS_LMS_URL . 'assets/course-builder.css',
			array(),
			TCNEXUS_LMS_VERSION
		);

		wp_enqueue_script(
			'tcnexus-course-builder',
			TCNEXUS_LMS_URL . 'assets/course-builder.js',
			array(),
			TCNEXUS_LMS_VERSION,
			true
		);

		TCNexus_Media::localize( 'tcnexus-course-builder' );
	}

	public static function render() {
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( 'You do not have permission to access this page.' );
		}

		$course_id = isset( $_GET['course_id'] ) ? absint( $_GET['course_id'] ) : 0;

		if ( $course_id ) {
			self::render_form( $course_id );
		} else {
			self::render_list();
		}
	}

	private static function render_list() {
		$courses = get_posts( array(
			'post_type'      => 'tc_course',
			'posts_per_page' => -1,
			'post_status'    => array( 'publish', 'draft' ),
			'orderby'        => 'title',
			'order'          => 'ASC',
		) );
		?>
		<div class="wrap tcn-list-wrap">
			<div class="tcn-list-header">
				<h1>Courses</h1>
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&new=1' ) ); ?>" class="tcn-add-course-btn">+ Add New Course</a>
			</div>

			<?php if ( isset( $_GET['deleted'] ) ) : ?>
				<div class="tcn-notice tcn-notice--success" style="margin-bottom:18px;">Course moved to trash.</div>
			<?php endif; ?>

			<?php if ( empty( $courses ) ) : ?>
				<p>No courses yet.</p>
			<?php else : ?>
				<div class="tcn-course-cards">
					<?php foreach ( $courses as $course ) :
						$types        = wp_get_post_terms( $course->ID, 'course_type', array( 'fields' => 'names' ) );
						$lesson_count = self::count_lessons( $course->ID );
						$edit_url     = admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&course_id=' . $course->ID );
						$delete_url   = wp_nonce_url(
							admin_url( 'admin-post.php?action=tcnexus_delete_course&course_id=' . $course->ID ),
							'tcnexus_delete_course_' . $course->ID
						);
					?>
						<div class="tcn-course-card">
							<a href="<?php echo esc_url( $edit_url ); ?>" class="tcn-course-card__link">
								<h2 class="tcn-course-card__title"><?php echo esc_html( $course->post_title ?: 'Untitled Course' ); ?></h2>
								<div class="tcn-course-card__meta">
									<span><?php echo esc_html( is_wp_error( $types ) ? '' : implode( ', ', $types ) ); ?></span>
									<span><?php echo (int) $lesson_count; ?> lesson<?php echo 1 === (int) $lesson_count ? '' : 's'; ?></span>
								</div>
								<div class="tcn-course-card__meta" style="margin-top:8px;">
									<span class="tcn-course-card__status tcn-course-card__status--<?php echo esc_attr( $course->post_status ); ?>">
										<?php echo esc_html( ucfirst( $course->post_status ) ); ?>
									</span>
								</div>
							</a>
							<button
								type="button"
								class="tcn-course-card__delete"
								data-delete-url="<?php echo esc_url( $delete_url ); ?>"
								data-course-title="<?php echo esc_attr( $course->post_title ?: 'Untitled Course' ); ?>"
								aria-label="Delete course"
								title="Delete course"
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M3 6h18" />
									<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
									<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
									<path d="M10 11v6" />
									<path d="M14 11v6" />
								</svg>
							</button>
						</div>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>

			<div class="tcn-modal-backdrop" id="tcn-delete-modal">
				<div class="tcn-modal" role="alertdialog" aria-modal="true" aria-labelledby="tcn-delete-modal-title">
					<h2 id="tcn-delete-modal-title">Delete course?</h2>
					<p id="tcn-delete-modal-message">Are you sure you want to delete this course?</p>
					<div class="tcn-modal__actions">
						<button type="button" class="tcn-btn-ghost" id="tcn-delete-modal-cancel">Cancel</button>
						<a href="#" class="tcn-btn-danger" id="tcn-delete-modal-confirm">Delete</a>
					</div>
				</div>
			</div>
		</div>
		<?php
	}

	private static function render_form( $course_id ) {
		$course = get_post( $course_id );
		if ( ! $course || 'tc_course' !== $course->post_type ) {
			echo '<div class="wrap"><p>Course not found.</p></div>';
			return;
		}

		$all_types      = get_terms( array( 'taxonomy' => 'course_type', 'hide_empty' => false ) );
		$selected_types = wp_get_post_terms( $course_id, 'course_type', array( 'fields' => 'slugs' ) );
		$level          = get_post_meta( $course_id, '_tcnexus_course_level', true ) ?: 'beginner';
		$language       = get_post_meta( $course_id, '_tcnexus_course_language', true ) ?: 'en';

		$image_desktop_id    = (int) get_post_meta( $course_id, '_tcnexus_image_desktop_id', true );
		$image_mobile_id     = (int) get_post_meta( $course_id, '_tcnexus_image_mobile_id', true );
		$thumbnail_desktop_id = (int) get_post_thumbnail_id( $course_id );
		$thumbnail_mobile_id  = (int) get_post_meta( $course_id, '_tcnexus_thumbnail_mobile_id', true );

		$instructor_id = (int) get_post_meta( $course_id, '_tcnexus_instructor_id', true );
		$guest_id      = (int) get_post_meta( $course_id, '_tcnexus_guest_id', true );

		$overview_link = get_post_meta( $course_id, '_tcnexus_overview_link', true );
		$trailer_link  = get_post_meta( $course_id, '_tcnexus_trailer_link', true );

		$all_people = get_posts( array(
			'post_type'      => 'tc_instructor',
			'posts_per_page' => -1,
			'post_status'    => array( 'publish', 'draft' ),
			'orderby'        => 'title',
			'order'          => 'ASC',
		) );

		// Instructor and Guest are separate roles from the same pool — a
		// person tagged as one never appears in the other's dropdown.
		$instructors = array();
		$guests      = array();
		foreach ( $all_people as $person ) {
			if ( 'guest' === TCNexus_Post_Types::get_person_role( $person->ID ) ) {
				$guests[] = $person;
			} else {
				$instructors[] = $person;
			}
		}

		$authors = get_users( array( 'capability' => array( 'edit_posts' ), 'orderby' => 'display_name' ) );

		$lessons = get_posts( array(
			'post_type'      => 'tc_lesson',
			'posts_per_page' => -1,
			'meta_key'       => '_tcnexus_course_id',
			'meta_value'     => $course_id,
			'orderby'        => 'menu_order',
			'order'          => 'ASC',
			'post_status'    => array( 'publish', 'draft' ),
		) );
		$lesson_views = TCNexus_Access_Control::count_views_for_lessons( wp_list_pluck( $lessons, 'ID' ) );

		$tabs = array(
			'basics' => 'Basics',
			'media'  => 'Media',
			'people' => 'People',
			'links'  => 'Links',
		);
		$active_tab = isset( $_GET['tab'] ) && array_key_exists( $_GET['tab'], $tabs ) ? $_GET['tab'] : 'basics';
		// "Save Lesson & Add New" (see the Lessons card's own Save buttons,
		// below #tcnexus-builder) redirects back here with this set, so the
		// blank row for the next lesson is already waiting after the reload.
		$add_row_on_load = isset( $_GET['add_row'] ) && '1' === $_GET['add_row'];
		?>
		<div class="wrap tcn-builder-wrap">
			<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE_SLUG ) ); ?>" class="tcn-back-link">
				<span aria-hidden="true">&larr;</span> Back To All Courses
			</a>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="tcnexus_save_course" />
				<input type="hidden" name="course_id" value="<?php echo esc_attr( $course_id ); ?>" />
				<?php wp_nonce_field( 'tcnexus_course_builder', 'tcnexus_course_builder_nonce' ); ?>

				<div id="tcnexus-builder" <?php if ( $add_row_on_load ) : ?>data-add-lesson-row="1"<?php endif; ?>>
					<div class="tcn-header">
						<div class="tcn-header__title-row">
							<p class="tcn-header__eyebrow">Course</p>
							<input type="text" id="course_title" name="course_title" class="tcn-title-input" value="<?php echo esc_attr( $course->post_title ); ?>" placeholder="Course title" />
							<div class="tcn-slug-row">
								<span class="tcn-slug-prefix">/courses/</span>
								<input type="text" id="course_slug" name="course_slug" class="tcn-slug-input" value="<?php echo esc_attr( $course->post_name ); ?>" />
							</div>
						</div>
						<div class="tcn-header__actions">
							<div class="tcn-status-toggle">
								<input type="radio" id="status_draft" name="course_status" value="draft" <?php checked( $course->post_status, 'draft' ); ?> />
								<label for="status_draft">Draft</label>
								<input type="radio" id="status_publish" name="course_status" value="publish" <?php checked( 'publish', $course->post_status ); ?> />
								<label for="status_publish">Published</label>
							</div>
							<button type="submit" class="tcn-save-btn">Save Course</button>
						</div>
					</div>

					<?php if ( isset( $_GET['saved'] ) ) : ?>
						<div class="tcn-notice tcn-notice--success" style="margin:16px 32px 0;">Course saved.</div>
					<?php endif; ?>

					<div class="tcn-tabs" role="tablist">
						<?php foreach ( $tabs as $key => $label ) : ?>
							<button type="button" class="tcn-tab" data-tab="<?php echo esc_attr( $key ); ?>" aria-controls="tcn-panel-<?php echo esc_attr( $key ); ?>" aria-selected="<?php echo $key === $active_tab ? 'true' : 'false'; ?>"><?php echo esc_html( $label ); ?></button>
						<?php endforeach; ?>
					</div>

					<!-- Basics -->
					<div class="tcn-panel<?php echo 'basics' === $active_tab ? ' is-active' : ''; ?>" id="tcn-panel-basics">
						<div class="tcn-row">
							<div class="tcn-field">
								<label class="tcn-field__label">Author</label>
								<select name="course_author" class="tcn-select">
									<?php foreach ( $authors as $user ) : ?>
										<option value="<?php echo esc_attr( $user->ID ); ?>" <?php selected( (int) $course->post_author, $user->ID ); ?>><?php echo esc_html( $user->display_name ); ?></option>
									<?php endforeach; ?>
								</select>
							</div>
							<div class="tcn-field">
								<label class="tcn-field__label">Course Level</label>
								<select name="course_level" class="tcn-select">
									<?php foreach ( self::LEVELS as $slug => $label ) : ?>
										<option value="<?php echo esc_attr( $slug ); ?>" <?php selected( $level, $slug ); ?>><?php echo esc_html( $label ); ?></option>
									<?php endforeach; ?>
								</select>
							</div>
							<div class="tcn-field">
								<label class="tcn-field__label">Course Language</label>
								<select name="course_language" class="tcn-select">
									<?php foreach ( self::LANGUAGES as $slug => $label ) : ?>
										<option value="<?php echo esc_attr( $slug ); ?>" <?php selected( $language, $slug ); ?>><?php echo esc_html( $label ); ?></option>
									<?php endforeach; ?>
								</select>
							</div>
						</div>

						<div class="tcn-field">
							<label class="tcn-field__label">Course Type</label>
							<div class="tcn-checkbox-group">
								<?php foreach ( $all_types as $term ) : ?>
									<div class="tcn-chip-checkbox">
										<input type="checkbox" id="type_<?php echo esc_attr( $term->slug ); ?>" name="course_types[]" value="<?php echo esc_attr( $term->slug ); ?>" <?php checked( in_array( $term->slug, $selected_types, true ) ); ?> />
										<label for="type_<?php echo esc_attr( $term->slug ); ?>"><?php echo esc_html( $term->name ); ?></label>
									</div>
								<?php endforeach; ?>
							</div>
							<?php if ( empty( $all_types ) ) : ?>
								<p class="tcn-field__hint">No course types yet — add some under Courses &rarr; Course Types.</p>
							<?php endif; ?>
						</div>

						<div class="tcn-field">
							<label class="tcn-field__label" for="course_content">Description</label>
							<?php
							wp_editor( $course->post_content, 'course_content', array(
								'textarea_name' => 'course_content',
								'textarea_rows' => 8,
								'media_buttons' => false,
							) );
							?>
						</div>
					</div>

					<!-- Media -->
					<div class="tcn-panel<?php echo 'media' === $active_tab ? ' is-active' : ''; ?>" id="tcn-panel-media">
						<div class="tcn-field">
							<label class="tcn-field__label">Course Image — main image for the course single page</label>
							<div class="tcn-media-grid">
								<?php
								self::render_media_picker( 'Desktop', 'image_desktop_id', $image_desktop_id, 'Select course image (desktop)', 1920, 1080 );
								self::render_media_picker( 'Mobile', 'image_mobile_id', $image_mobile_id, 'Select course image (mobile)', 1080, 1350 );
								?>
							</div>
						</div>
						<div class="tcn-field">
							<label class="tcn-field__label">Course Thumbnail — used in course grids/cards</label>
							<div class="tcn-media-grid">
								<?php
								self::render_media_picker( 'Desktop', 'thumbnail_desktop_id', $thumbnail_desktop_id, 'Select course thumbnail (desktop)', 1280, 720 );
								self::render_media_picker( 'Mobile', 'thumbnail_mobile_id', $thumbnail_mobile_id, 'Select course thumbnail (mobile)', 640, 360 );
								?>
							</div>
						</div>
					</div>

					<!-- People -->
					<div class="tcn-panel<?php echo 'people' === $active_tab ? ' is-active' : ''; ?>" id="tcn-panel-people">
						<?php
						self::render_person_field( 'Instructor', 'instructor_id', $instructors, $instructor_id, 'instructor' );
						self::render_person_field( 'Guest', 'guest_id', $guests, $guest_id, 'guest' );
						?>

						<!-- Rendered once, reused for both fields above — the "+" button
						     records which <select> to update in data-target-select. -->
						<div class="tcn-modal-backdrop" id="tcn-quick-person-modal">
							<div class="tcn-modal">
								<h2 id="tcn-quick-person-title">Add Person</h2>
								<div class="tcn-field">
									<label class="tcn-field__label" for="tcn-quick-person-name">Name</label>
									<input type="text" id="tcn-quick-person-name" class="tcn-input" />
								</div>
								<div class="tcn-field">
									<label class="tcn-field__label">Photo</label>
									<div class="tcn-media-grid" style="grid-template-columns:minmax(180px,240px);">
										<?php TCNexus_Media::render_picker( 'Select Photo', 'quick_person_photo', 0, 'Select photo', 500, 500 ); ?>
									</div>
								</div>
								<div class="tcn-field">
									<label class="tcn-field__label" for="tcn-quick-person-bio">Bio</label>
									<textarea id="tcn-quick-person-bio" class="tcn-textarea" rows="4"></textarea>
								</div>
								<p class="tcn-cropper-error" id="tcn-quick-person-error" style="display:none;"></p>
								<div class="tcn-modal__actions">
									<button type="button" class="tcn-btn-ghost" id="tcn-quick-person-cancel">Cancel</button>
									<button type="button" class="tcn-save-btn" id="tcn-quick-person-create">Create</button>
								</div>
							</div>
						</div>
					</div>

					<!-- Links -->
					<div class="tcn-panel<?php echo 'links' === $active_tab ? ' is-active' : ''; ?>" id="tcn-panel-links">
						<div class="tcn-field">
							<label class="tcn-field__label" for="overview_link">Course Overview Link</label>
							<input type="url" id="overview_link" name="overview_link" class="tcn-input" value="<?php echo esc_attr( $overview_link ); ?>" placeholder="https://…" />
						</div>
						<div class="tcn-field">
							<label class="tcn-field__label" for="trailer_link">Course Trailer Link</label>
							<input type="url" id="trailer_link" name="trailer_link" class="tcn-input" value="<?php echo esc_attr( $trailer_link ); ?>" placeholder="https://vimeo.com/…" />
						</div>
					</div>

				</div>

				<!-- Lessons — a separate card below the course-details card
				     above, not one of its tabs. Still inside the same <form>
				     so "Save Lesson" submits alongside everything else. -->
				<div class="tcn-lessons-card">
					<div class="tcn-lessons-card__header">
						<h2 class="tcn-lessons-card__title">Lessons</h2>
						<button type="button" class="tcn-btn-ghost" id="tcnexus-add-lesson">+ Add Lesson</button>
					</div>

					<table class="tcn-lessons-overview">
						<thead>
							<tr>
								<th class="tcn-lessons-overview__order">Lesson No.</th>
								<th>Title</th>
								<th class="tcn-lessons-overview__level">Tier</th>
								<th class="tcn-lessons-overview__duration">Duration</th>
								<th class="tcn-lessons-overview__views">Views</th>
							</tr>
						</thead>
						<tbody id="tcnexus-lessons-list">
							<?php if ( empty( $lessons ) ) : ?>
								<tr class="tcn-lessons-empty-row" id="tcnexus-lessons-empty">
									<td colspan="5">No lessons yet.</td>
								</tr>
							<?php else : ?>
								<?php foreach ( $lessons as $index => $lesson ) :
									$tier              = TCNexus_Post_Types::get_lesson_tier( $lesson->ID );
									$video_id          = get_post_meta( $lesson->ID, '_tcnexus_vimeo_id', true );
									$video_source      = get_post_meta( $lesson->ID, '_tcnexus_video_source', true ) ?: 'vimeo';
									$duration          = get_post_meta( $lesson->ID, '_tcnexus_duration', true );
									$thumbnail_id      = get_post_thumbnail_id( $lesson->ID );
									$row_key           = $lesson->ID;
									$video_placeholder = 'youtube' === $video_source ? 'YouTube Video ID' : 'Vimeo Video ID';
									$views             = isset( $lesson_views[ $lesson->ID ] ) ? $lesson_views[ $lesson->ID ] : 0;
								?>
									<tr class="tcn-lesson-row">
										<td class="tcn-lessons-overview__order"><?php echo esc_html( sprintf( '%02d', $lesson->menu_order ?: ( $index + 1 ) ) ); ?></td>
										<td>
											<div class="tcn-lesson-row__title">
												<svg class="tcn-lesson-row__chevron" width="16" height="16" viewBox="0 0 24 24"><polygon points="8,5 8,19 18,12" fill="#E5E3DB" /></svg>
												<span><?php echo esc_html( $lesson->post_title ); ?></span>
											</div>
										</td>
										<td class="tcn-lessons-overview__level"><span class="tcn-level-chip tcn-level-chip--<?php echo esc_attr( $tier ); ?>"><?php echo esc_html( ucfirst( $tier ) ); ?></span></td>
										<td class="tcn-lessons-overview__duration"><?php echo esc_html( $duration ?: '—' ); ?></td>
										<td class="tcn-lessons-overview__views"><?php echo esc_html( number_format_i18n( $views ) ); ?></td>
									</tr>
									<tr class="tcn-lesson-expand">
										<td colspan="5">
											<div class="tcn-lesson-expand__panel">
												<div class="tcn-lesson-card">
													<div class="tcn-lesson-card__media">
														<?php TCNexus_Media::render_picker( 'Select Image', "lessons[existing][{$row_key}][thumbnail_id]", $thumbnail_id, 'Select episode image', 640, 360 ); ?>
													</div>
													<div class="tcn-lesson-card__body">
														<div class="tcn-lesson-card__row tcn-lesson-card__row--top">
															<div class="tcn-lesson-card__order">
																<label class="tcn-field__label">Order</label>
																<select name="lessons[existing][<?php echo esc_attr( $row_key ); ?>][order]" class="tcn-select">
																	<?php self::render_order_options( $lesson->menu_order ?: ( $index + 1 ) ); ?>
																</select>
															</div>
															<div class="tcn-lesson-card__title">
																<label class="tcn-field__label">Title</label>
																<input type="text" name="lessons[existing][<?php echo esc_attr( $row_key ); ?>][title]" value="<?php echo esc_attr( $lesson->post_title ); ?>" />
															</div>
														</div>
														<div class="tcn-lesson-card__row tcn-lesson-card__row--video">
															<?php self::render_video_source_toggle( "lessons[existing][{$row_key}][video_source]", "video_source_{$row_key}", $video_source ); ?>
															<input type="text" class="tcn-video-id-input" name="lessons[existing][<?php echo esc_attr( $row_key ); ?>][vimeo_id]" value="<?php echo esc_attr( $video_id ); ?>" placeholder="<?php echo esc_attr( $video_placeholder ); ?>" />
														</div>
														<div class="tcn-lesson-card__row tcn-lesson-card__row--meta">
															<div class="tcn-lesson-card__duration">
																<label class="tcn-field__label">Duration</label>
																<input type="text" class="tcn-duration-input" name="lessons[existing][<?php echo esc_attr( $row_key ); ?>][duration]" value="<?php echo esc_attr( $duration ); ?>" placeholder="e.g. 12:45" />
															</div>
															<div class="tcn-lesson-card__tier">
																<label class="tcn-field__label">Tier</label>
																<?php self::render_tier_toggle( "lessons[existing][{$row_key}][tier]", "tier_{$row_key}", $tier ); ?>
															</div>
														</div>
														<div class="tcn-lesson-card__footer">
															<input type="checkbox" class="tcn-lesson-delete-flag" name="lessons[existing][<?php echo esc_attr( $row_key ); ?>][delete]" value="1" style="display:none;" />
															<button type="button" class="tcn-btn-ghost tcn-btn-ghost--danger tcn-remove-row">Remove</button>
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

					<div class="tcn-lesson-save-actions">
						<button type="submit" name="lesson_action" value="save" class="tcn-btn-ghost">Save Lesson</button>
						<button type="submit" name="lesson_action" value="save_add_new" class="tcn-btn-ghost">Save Lesson &amp; Add New</button>
					</div>

					<template id="tcnexus-lesson-row-template">
						<tr class="tcn-lesson-row is-open">
							<td class="tcn-lessons-overview__order">—</td>
							<td>
								<div class="tcn-lesson-row__title">
									<svg class="tcn-lesson-row__chevron" width="16" height="16" viewBox="0 0 24 24"><polygon points="8,5 8,19 18,12" fill="#E5E3DB" /></svg>
									<span>New lesson</span>
								</div>
							</td>
							<td class="tcn-lessons-overview__level"><span class="tcn-level-chip tcn-level-chip--free">Free</span></td>
							<td class="tcn-lessons-overview__duration">—</td>
							<td class="tcn-lessons-overview__views">0</td>
						</tr>
						<tr class="tcn-lesson-expand is-open">
							<td colspan="5">
								<div class="tcn-lesson-expand__panel">
									<div class="tcn-lesson-card">
										<div class="tcn-lesson-card__media">
											<?php TCNexus_Media::render_picker( 'Select Image', 'lessons[new][__INDEX__][thumbnail_id]', 0, 'Select episode image', 640, 360 ); ?>
										</div>
										<div class="tcn-lesson-card__body">
											<div class="tcn-lesson-card__row tcn-lesson-card__row--top">
												<div class="tcn-lesson-card__order">
													<label class="tcn-field__label">Order</label>
													<select name="lessons[new][__INDEX__][order]" class="tcn-select">
														<?php self::render_order_options( 1 ); ?>
													</select>
												</div>
												<div class="tcn-lesson-card__title">
													<label class="tcn-field__label">Title</label>
													<input type="text" name="lessons[new][__INDEX__][title]" placeholder="Lesson title" />
												</div>
											</div>
											<div class="tcn-lesson-card__row tcn-lesson-card__row--video">
												<?php self::render_video_source_toggle( 'lessons[new][__INDEX__][video_source]', 'video_source___INDEX__', 'vimeo' ); ?>
												<input type="text" class="tcn-video-id-input" name="lessons[new][__INDEX__][vimeo_id]" placeholder="Vimeo Video ID" />
											</div>
											<div class="tcn-lesson-card__row tcn-lesson-card__row--meta">
												<div class="tcn-lesson-card__duration">
													<label class="tcn-field__label">Duration</label>
													<input type="text" class="tcn-duration-input" name="lessons[new][__INDEX__][duration]" placeholder="e.g. 12:45" />
												</div>
												<div class="tcn-lesson-card__tier">
													<label class="tcn-field__label">Tier</label>
													<?php self::render_tier_toggle( 'lessons[new][__INDEX__][tier]', 'tier___INDEX__', 'free' ); ?>
												</div>
											</div>
											<div class="tcn-lesson-card__footer">
												<button type="button" class="tcn-btn-ghost tcn-btn-ghost--danger tcn-remove-row">Remove</button>
											</div>
										</div>
									</div>
								</div>
							</td>
						</tr>
					</template>
				</div>
			</form>
		</div>
		<?php
	}

	private static function render_order_options( $selected ) {
		for ( $i = 1; $i <= 100; $i++ ) {
			printf(
				'<option value="%1$d" %2$s>%3$s</option>',
				$i,
				selected( (int) $selected, $i, false ),
				esc_html( sprintf( '%02d', $i ) )
			);
		}
	}

	private static function render_video_source_toggle( $name, $id_prefix, $selected ) {
		self::render_pill_toggle( $name, $id_prefix, array( 'vimeo' => 'Vimeo', 'youtube' => 'YouTube' ), $selected );
	}

	private static function render_tier_toggle( $name, $id_prefix, $selected ) {
		self::render_pill_toggle( $name, $id_prefix, array( 'free' => 'Free', 'paid' => 'Paid' ), $selected );
	}

	private static function render_pill_toggle( $name, $id_prefix, $options, $selected ) {
		?>
		<div class="tcn-pill-toggle">
			<?php foreach ( $options as $value => $label ) :
				$id = $id_prefix . '_' . $value;
			?>
				<input type="radio" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $name ); ?>" value="<?php echo esc_attr( $value ); ?>" <?php checked( $selected, $value ); ?> />
				<label for="<?php echo esc_attr( $id ); ?>"><?php echo esc_html( $label ); ?></label>
			<?php endforeach; ?>
		</div>
		<?php
	}

	private static function render_media_picker( $label, $field_key, $attachment_id, $title, $crop_width = 0, $crop_height = 0 ) {
		TCNexus_Media::render_picker( $label, $field_key, $attachment_id, $title, $crop_width, $crop_height );
	}

	/**
	 * Instructor and Guest are each a dropdown over their own slice of the
	 * Instructors & Guests pool (see TCNexus_Post_Types::get_person_role),
	 * plus a "+" that opens the shared quick-create modal (see the People
	 * tab markup) targeting this exact <select> by its name attribute, and
	 * tagging the new person with $role so they land in the right list.
	 */
	private static function render_person_field( $label, $field_name, $people, $selected_id, $role ) {
		?>
		<div class="tcn-field">
			<label class="tcn-field__label"><?php echo esc_html( $label ); ?></label>
			<div class="tcn-person-field">
				<select name="<?php echo esc_attr( $field_name ); ?>" class="tcn-select">
					<option value="">— None —</option>
					<?php foreach ( $people as $person ) : ?>
						<option value="<?php echo esc_attr( $person->ID ); ?>" <?php selected( $selected_id, $person->ID ); ?>><?php echo esc_html( $person->post_title ); ?></option>
					<?php endforeach; ?>
				</select>
				<button type="button" class="tcn-btn-ghost tcn-add-person" data-target-select="<?php echo esc_attr( $field_name ); ?>" data-role="<?php echo esc_attr( $role ); ?>" aria-label="Add new <?php echo esc_attr( $role ); ?>">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
				</button>
			</div>
		</div>
		<?php
	}

	public static function handle_save() {
		if ( ! isset( $_POST['tcnexus_course_builder_nonce'] ) ||
			! wp_verify_nonce( $_POST['tcnexus_course_builder_nonce'], 'tcnexus_course_builder' ) ) {
			wp_die( 'Invalid request.' );
		}

		$course_id = isset( $_POST['course_id'] ) ? absint( $_POST['course_id'] ) : 0;
		if ( ! $course_id || ! current_user_can( 'edit_post', $course_id ) ) {
			wp_die( 'Invalid course.' );
		}

		$status = isset( $_POST['course_status'] ) && 'publish' === $_POST['course_status'] ? 'publish' : 'draft';
		$slug   = isset( $_POST['course_slug'] ) ? sanitize_title( wp_unslash( $_POST['course_slug'] ) ) : '';

		$update = array(
			'ID'           => $course_id,
			'post_title'   => sanitize_text_field( wp_unslash( $_POST['course_title'] ?? '' ) ),
			'post_content' => wp_kses_post( wp_unslash( $_POST['course_content'] ?? '' ) ),
			'post_status'  => $status,
		);
		if ( '' !== $slug ) {
			$update['post_name'] = $slug;
		}
		if ( ! empty( $_POST['course_author'] ) ) {
			$update['post_author'] = absint( $_POST['course_author'] );
		}
		wp_update_post( $update );

		$types = isset( $_POST['course_types'] ) ? array_map( 'sanitize_text_field', (array) wp_unslash( $_POST['course_types'] ) ) : array();
		wp_set_post_terms( $course_id, $types, 'course_type', false );

		$level = isset( $_POST['course_level'] ) ? sanitize_key( $_POST['course_level'] ) : 'beginner';
		update_post_meta( $course_id, '_tcnexus_course_level', array_key_exists( $level, self::LEVELS ) ? $level : 'beginner' );

		$language = isset( $_POST['course_language'] ) ? sanitize_key( $_POST['course_language'] ) : 'en';
		update_post_meta( $course_id, '_tcnexus_course_language', array_key_exists( $language, self::LANGUAGES ) ? $language : 'en' );

		if ( isset( $_POST['image_desktop_id'] ) ) {
			update_post_meta( $course_id, '_tcnexus_image_desktop_id', absint( $_POST['image_desktop_id'] ) );
		}
		if ( isset( $_POST['image_mobile_id'] ) ) {
			update_post_meta( $course_id, '_tcnexus_image_mobile_id', absint( $_POST['image_mobile_id'] ) );
		}
		if ( ! empty( $_POST['thumbnail_desktop_id'] ) ) {
			set_post_thumbnail( $course_id, absint( $_POST['thumbnail_desktop_id'] ) );
		} else {
			delete_post_thumbnail( $course_id );
		}
		if ( isset( $_POST['thumbnail_mobile_id'] ) ) {
			update_post_meta( $course_id, '_tcnexus_thumbnail_mobile_id', absint( $_POST['thumbnail_mobile_id'] ) );
		}

		if ( isset( $_POST['instructor_id'] ) ) {
			update_post_meta( $course_id, '_tcnexus_instructor_id', absint( $_POST['instructor_id'] ) );
		}
		if ( isset( $_POST['guest_id'] ) ) {
			update_post_meta( $course_id, '_tcnexus_guest_id', absint( $_POST['guest_id'] ) );
		}

		update_post_meta( $course_id, '_tcnexus_overview_link', esc_url_raw( wp_unslash( $_POST['overview_link'] ?? '' ) ) );
		update_post_meta( $course_id, '_tcnexus_trailer_link', esc_url_raw( wp_unslash( $_POST['trailer_link'] ?? '' ) ) );

		if ( ! empty( $_POST['lessons']['existing'] ) && is_array( $_POST['lessons']['existing'] ) ) {
			foreach ( $_POST['lessons']['existing'] as $lesson_id => $data ) {
				$lesson_id = absint( $lesson_id );
				if ( ! $lesson_id || ! current_user_can( 'edit_post', $lesson_id ) ) {
					continue;
				}

				if ( ! empty( $data['delete'] ) ) {
					wp_trash_post( $lesson_id );
					continue;
				}

				self::persist_lesson_fields( $lesson_id, $data );
				update_post_meta( $lesson_id, '_tcnexus_course_id', $course_id );
			}
		}

		if ( ! empty( $_POST['lessons']['new'] ) && is_array( $_POST['lessons']['new'] ) ) {
			foreach ( $_POST['lessons']['new'] as $data ) {
				$title = trim( sanitize_text_field( wp_unslash( $data['title'] ?? '' ) ) );
				if ( '' === $title ) {
					continue; // Skip untouched template rows.
				}

				$new_id = wp_insert_post( array(
					'post_type'   => 'tc_lesson',
					'post_title'  => $title,
					'post_status' => 'publish',
					'menu_order'  => isset( $data['order'] ) ? absint( $data['order'] ) : 0,
				) );

				if ( ! is_wp_error( $new_id ) ) {
					update_post_meta( $new_id, '_tcnexus_course_id', $course_id );
					update_post_meta( $new_id, '_tcnexus_vimeo_id', sanitize_text_field( wp_unslash( $data['vimeo_id'] ?? '' ) ) );
					update_post_meta( $new_id, '_tcnexus_video_source', self::sanitize_video_source( $data['video_source'] ?? 'vimeo' ) );
					update_post_meta( $new_id, '_tcnexus_duration', sanitize_text_field( wp_unslash( $data['duration'] ?? '' ) ) );
					TCNexus_Post_Types::set_lesson_tier( $new_id, sanitize_key( $data['tier'] ?? 'free' ) );
					if ( ! empty( $data['thumbnail_id'] ) ) {
						set_post_thumbnail( $new_id, absint( $data['thumbnail_id'] ) );
					}
				}
			}
		}

		$redirect = admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&course_id=' . $course_id . '&saved=1' );

		// "Save Lesson & Add New" (see the Lessons card's own Save buttons)
		// has a blank row waiting after the reload — see the
		// data-add-lesson-row handling in course-builder.js.
		$lesson_action = isset( $_POST['lesson_action'] ) ? sanitize_key( $_POST['lesson_action'] ) : '';
		if ( 'save_add_new' === $lesson_action ) {
			$redirect .= '&add_row=1';
		}

		wp_safe_redirect( $redirect );
		exit;
	}

	private static function sanitize_video_source( $source ) {
		$source = sanitize_key( $source );
		return in_array( $source, array( 'vimeo', 'youtube' ), true ) ? $source : 'vimeo';
	}

	/**
	 * Saves an existing lesson's editable fields (everything except which
	 * course it belongs to). Shared by this class's own form-based save
	 * above and by TCNexus_Global_Lessons's per-row AJAX save, so both
	 * surfaces persist a lesson the exact same way.
	 */
	public static function persist_lesson_fields( $lesson_id, array $data ) {
		wp_update_post( array(
			'ID'         => $lesson_id,
			'post_title' => sanitize_text_field( wp_unslash( $data['title'] ?? '' ) ),
			'menu_order' => isset( $data['order'] ) ? absint( $data['order'] ) : 0,
		) );
		update_post_meta( $lesson_id, '_tcnexus_vimeo_id', sanitize_text_field( wp_unslash( $data['vimeo_id'] ?? '' ) ) );
		update_post_meta( $lesson_id, '_tcnexus_video_source', self::sanitize_video_source( $data['video_source'] ?? 'vimeo' ) );
		update_post_meta( $lesson_id, '_tcnexus_duration', sanitize_text_field( wp_unslash( $data['duration'] ?? '' ) ) );
		TCNexus_Post_Types::set_lesson_tier( $lesson_id, sanitize_key( $data['tier'] ?? 'free' ) );
		if ( ! empty( $data['thumbnail_id'] ) ) {
			set_post_thumbnail( $lesson_id, absint( $data['thumbnail_id'] ) );
		} else {
			delete_post_thumbnail( $lesson_id );
		}
	}

	public static function handle_delete_course() {
		$course_id = isset( $_GET['course_id'] ) ? absint( $_GET['course_id'] ) : 0;

		if ( ! $course_id || ! check_admin_referer( 'tcnexus_delete_course_' . $course_id ) ) {
			wp_die( 'Invalid request.' );
		}

		if ( ! current_user_can( 'delete_post', $course_id ) || 'tc_course' !== get_post_type( $course_id ) ) {
			wp_die( 'You do not have permission to delete this course.' );
		}

		wp_trash_post( $course_id );

		wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&deleted=1' ) );
		exit;
	}

	private static function count_lessons( $course_id ) {
		$query = new WP_Query( array(
			'post_type'      => 'tc_lesson',
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'meta_key'       => '_tcnexus_course_id',
			'meta_value'     => $course_id,
		) );
		return (int) $query->found_posts;
	}
}
