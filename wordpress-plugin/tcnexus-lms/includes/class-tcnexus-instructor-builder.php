<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * A styled admin page for managing Instructor profiles (name, photo, bio),
 * replacing tc_instructor's native WordPress editor screens the same way
 * TCNexus_Course_Builder replaces tc_course's — so this reusable-across-
 * courses entity is edited on the same design system as everything else
 * under the Courses menu, instead of the native post editor.
 */
class TCNexus_Instructor_Builder {

	const PAGE_SLUG = 'tcnexus-instructor-builder';
	const QUICK_CREATE_NONCE_ACTION = 'tcnexus_quick_create_person';

	private static $hook_suffix;

	public static function register() {
		self::$hook_suffix = add_submenu_page(
			null,
			'Instructors & Guests',
			'Instructors & Guests',
			'edit_posts',
			self::PAGE_SLUG,
			array( __CLASS__, 'render' )
		);

		add_action( 'load-' . self::$hook_suffix, array( __CLASS__, 'maybe_create_instructor' ) );
		add_action( 'load-' . self::$hook_suffix, array( __CLASS__, 'set_page_title' ) );
		add_action( 'load-edit.php', array( __CLASS__, 'redirect_instructor_list' ) );
		add_action( 'load-post-new.php', array( __CLASS__, 'redirect_instructor_new' ) );
		add_action( 'load-post.php', array( __CLASS__, 'redirect_instructor_edit' ) );
	}

	public static function set_page_title() {
		global $title;
		$title = 'Instructors & Guests';
	}

	public static function maybe_create_instructor() {
		if ( ! isset( $_GET['new'] ) || '1' !== $_GET['new'] ) {
			return;
		}
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( 'You do not have permission to access this page.' );
		}

		$role = isset( $_GET['role'] ) && 'guest' === $_GET['role'] ? 'guest' : 'instructor';

		$new_id = wp_insert_post( array(
			'post_type'   => 'tc_instructor',
			'post_title'  => 'guest' === $role ? 'Untitled Guest' : 'Untitled Instructor',
			'post_status' => 'publish',
		) );
		TCNexus_Post_Types::set_person_role( $new_id, $role );
		// new_flow=1 travels with this instructor through its first save (see
		// handle_save()) so the form knows to auto-reset into another blank
		// "Add New" afterward instead of just sitting on the saved profile —
		// only for a genuinely fresh instructor, not later edits reached any
		// other way (e.g. from the list).
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&instructor_id=' . $new_id . '&new_flow=1' ) );
		exit;
	}

	public static function redirect_instructor_list() {
		if ( isset( $_GET['post_type'] ) && 'tc_instructor' === $_GET['post_type'] ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG ) );
			exit;
		}
	}

	public static function redirect_instructor_new() {
		if ( isset( $_GET['post_type'] ) && 'tc_instructor' === $_GET['post_type'] ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&new=1' ) );
			exit;
		}
	}

	public static function redirect_instructor_edit() {
		$action = isset( $_GET['action'] ) ? $_GET['action'] : 'edit';
		if ( 'edit' !== $action || empty( $_GET['post'] ) ) {
			return;
		}

		$post_id = absint( $_GET['post'] );
		if ( 'tc_instructor' === get_post_type( $post_id ) ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&instructor_id=' . $post_id ) );
			exit;
		}
	}

	public static function enqueue_assets( $hook ) {
		if ( $hook !== self::$hook_suffix ) {
			return;
		}

		wp_enqueue_media();

		// Same design-system stylesheet/script as the Course Builder — one
		// shared visual language, not a parallel copy.
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

		$instructor_id = isset( $_GET['instructor_id'] ) ? absint( $_GET['instructor_id'] ) : 0;

		if ( $instructor_id ) {
			self::render_form( $instructor_id );
		} else {
			self::render_list();
		}
	}

	private static function render_list() {
		$people = get_posts( array(
			'post_type'      => 'tc_instructor',
			'posts_per_page' => -1,
			'post_status'    => array( 'publish', 'draft' ),
			'orderby'        => 'title',
			'order'          => 'ASC',
		) );

		$instructors = array();
		$guests      = array();
		foreach ( $people as $person ) {
			if ( 'guest' === TCNexus_Post_Types::get_person_role( $person->ID ) ) {
				$guests[] = $person;
			} else {
				$instructors[] = $person;
			}
		}
		?>
		<div class="wrap tcn-list-wrap">
			<div class="tcn-list-header">
				<h1>Instructors &amp; Guests</h1>
			</div>

			<?php if ( isset( $_GET['deleted'] ) ) : ?>
				<div class="tcn-notice tcn-notice--success" style="margin-bottom:18px;">Person moved to trash.</div>
			<?php endif; ?>

			<div class="tcn-person-section">
				<div class="tcn-list-header tcn-list-header--sub">
					<h2>Instructors</h2>
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&new=1&role=instructor' ) ); ?>" class="tcn-add-course-btn">+ Add New Instructor</a>
				</div>
				<?php self::render_person_cards( $instructors, 'Untitled Instructor' ); ?>
			</div>

			<div class="tcn-person-section tcn-person-section--guests">
				<div class="tcn-list-header tcn-list-header--sub tcn-list-header--guests">
					<h2>Guests</h2>
					<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&new=1&role=guest' ) ); ?>" class="tcn-add-course-btn">+ Add New Guest</a>
				</div>
				<?php self::render_person_cards( $guests, 'Untitled Guest' ); ?>
			</div>

			<div class="tcn-modal-backdrop" id="tcn-delete-modal">
				<div class="tcn-modal" role="alertdialog" aria-modal="true" aria-labelledby="tcn-delete-modal-title">
					<h2 id="tcn-delete-modal-title">Delete this person?</h2>
					<p id="tcn-delete-modal-message">Are you sure you want to delete this person?</p>
					<div class="tcn-modal__actions">
						<button type="button" class="tcn-btn-ghost" id="tcn-delete-modal-cancel">Cancel</button>
						<a href="#" class="tcn-btn-danger" id="tcn-delete-modal-confirm">Delete</a>
					</div>
				</div>
			</div>
		</div>
		<?php
	}

	private static function render_person_cards( $people, $untitled_label ) {
		if ( empty( $people ) ) {
			echo '<p class="tcn-empty-note">None yet.</p>';
			return;
		}
		?>
		<div class="tcn-course-cards">
			<?php foreach ( $people as $person ) :
				$edit_url   = admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&instructor_id=' . $person->ID );
				$photo      = get_the_post_thumbnail_url( $person->ID, 'medium' );
				$delete_url = wp_nonce_url(
					admin_url( 'admin-post.php?action=tcnexus_delete_instructor&instructor_id=' . $person->ID ),
					'tcnexus_delete_instructor_' . $person->ID
				);
			?>
				<div class="tcn-course-card">
					<a href="<?php echo esc_url( $edit_url ); ?>" class="tcn-course-card__link">
						<?php if ( $photo ) : ?>
							<img src="<?php echo esc_url( $photo ); ?>" alt="" style="width:48px;height:48px;border-radius:50%;object-fit:cover;margin-bottom:12px;" />
						<?php endif; ?>
						<h2 class="tcn-course-card__title"><?php echo esc_html( $person->post_title ?: $untitled_label ); ?></h2>
					</a>
					<button
						type="button"
						class="tcn-course-card__delete"
						data-delete-url="<?php echo esc_url( $delete_url ); ?>"
						data-course-title="<?php echo esc_attr( $person->post_title ?: $untitled_label ); ?>"
						aria-label="Delete"
						title="Delete"
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
		<?php
	}

	private static function render_form( $instructor_id ) {
		$person = get_post( $instructor_id );
		if ( ! $person || 'tc_instructor' !== $person->post_type ) {
			echo '<div class="wrap"><p>Instructor not found.</p></div>';
			return;
		}

		$photo_id  = (int) get_post_thumbnail_id( $instructor_id );
		$role      = TCNexus_Post_Types::get_person_role( $instructor_id );
		$new_flow  = isset( $_GET['new_flow'] ) && '1' === $_GET['new_flow'];
		$auto_reset = $new_flow && isset( $_GET['saved'] );
		?>
		<div class="wrap tcn-builder-wrap">
			<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE_SLUG ) ); ?>" class="tcn-back-link">
				<span aria-hidden="true">&larr;</span> Back To All Instructors &amp; Guests
			</a>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="tcnexus_save_instructor" />
				<input type="hidden" name="instructor_id" value="<?php echo esc_attr( $instructor_id ); ?>" />
				<input type="hidden" name="new_flow" value="<?php echo $new_flow ? '1' : '0'; ?>" />
				<?php wp_nonce_field( 'tcnexus_instructor_builder', 'tcnexus_instructor_builder_nonce' ); ?>

				<div id="tcnexus-builder">
					<div class="tcn-header">
						<div class="tcn-header__title-row">
							<p class="tcn-header__eyebrow"><?php echo 'guest' === $role ? 'Guest' : 'Instructor'; ?></p>
							<input type="text" id="instructor_name" name="instructor_name" class="tcn-title-input" value="<?php echo esc_attr( $person->post_title ); ?>" placeholder="Name" />
						</div>
						<div class="tcn-header__actions">
							<button type="submit" class="tcn-save-btn">Save</button>
						</div>
					</div>

					<?php if ( isset( $_GET['saved'] ) && ! $auto_reset ) : ?>
						<div class="tcn-notice tcn-notice--success" style="margin:16px 32px 0;">Saved.</div>
					<?php endif; ?>

					<div class="tcn-panel is-active">
						<div class="tcn-field">
							<label class="tcn-field__label">Role</label>
							<div class="tcn-pill-toggle">
								<input type="radio" id="role_instructor" name="role" value="instructor" <?php checked( $role, 'instructor' ); ?> />
								<label for="role_instructor">Instructor</label>
								<input type="radio" id="role_guest" name="role" value="guest" <?php checked( $role, 'guest' ); ?> />
								<label for="role_guest">Guest</label>
							</div>
						</div>

						<div class="tcn-field">
							<label class="tcn-field__label">Photo</label>
							<div class="tcn-media-grid" style="grid-template-columns:minmax(220px,320px);">
								<?php self::render_media_picker( 'photo_id', $photo_id, 'Select photo' ); ?>
							</div>
						</div>

						<div class="tcn-field">
							<label class="tcn-field__label" for="instructor_bio">Bio</label>
							<?php
							wp_editor( $person->post_content, 'instructor_bio', array(
								'textarea_name' => 'instructor_bio',
								'textarea_rows' => 8,
								'media_buttons' => false,
							) );
							?>
						</div>
					</div>
				</div>
			</form>

			<?php if ( $auto_reset ) : ?>
				<!-- Rendered already-open (no JS involved) and with no
				     dismiss handler wired to it anywhere — the only way off
				     this screen is one of the two explicit choices. -->
				<div class="tcn-modal-backdrop is-open" id="tcn-instructor-saved-modal">
					<div class="tcn-modal tcn-modal--center">
						<h2><?php echo 'guest' === $role ? 'Guest Added' : 'Instructor Added'; ?></h2>
						<p>What would you like to do next?</p>
						<div class="tcn-modal__actions">
							<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE_SLUG ) ); ?>" class="tcn-btn-ghost">Back To All Instructors &amp; Guests</a>
							<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&new=1&role=' . $role ) ); ?>" class="tcn-save-btn">Add New <?php echo 'guest' === $role ? 'Guest' : 'Instructor'; ?></a>
						</div>
					</div>
				</div>
			<?php endif; ?>
		</div>
		<?php
	}

	private static function render_media_picker( $field_key, $attachment_id, $title ) {
		TCNexus_Media::render_picker( 'Select Photo', $field_key, $attachment_id, $title, 500, 500 );
	}

	public static function handle_save() {
		if ( ! isset( $_POST['tcnexus_instructor_builder_nonce'] ) ||
			! wp_verify_nonce( $_POST['tcnexus_instructor_builder_nonce'], 'tcnexus_instructor_builder' ) ) {
			wp_die( 'Invalid request.' );
		}

		$instructor_id = isset( $_POST['instructor_id'] ) ? absint( $_POST['instructor_id'] ) : 0;
		if ( ! $instructor_id || ! current_user_can( 'edit_post', $instructor_id ) ) {
			wp_die( 'Invalid instructor.' );
		}

		wp_update_post( array(
			'ID'           => $instructor_id,
			'post_title'   => sanitize_text_field( wp_unslash( $_POST['instructor_name'] ?? '' ) ),
			'post_content' => wp_kses_post( wp_unslash( $_POST['instructor_bio'] ?? '' ) ),
		) );

		TCNexus_Post_Types::set_person_role( $instructor_id, sanitize_key( $_POST['role'] ?? 'instructor' ) );

		if ( ! empty( $_POST['photo_id'] ) ) {
			set_post_thumbnail( $instructor_id, absint( $_POST['photo_id'] ) );
		} else {
			delete_post_thumbnail( $instructor_id );
		}

		$redirect = admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&instructor_id=' . $instructor_id . '&saved=1' );
		if ( ! empty( $_POST['new_flow'] ) && '1' === $_POST['new_flow'] ) {
			$redirect .= '&new_flow=1';
		}

		wp_safe_redirect( $redirect );
		exit;
	}

	/**
	 * Lets Course Builder's People tab create a new Instructor/Guest profile
	 * inline (via the "+" button next to each dropdown) without leaving the
	 * course, instead of forcing a trip to the full Instructors & Guests
	 * page. Returns just enough for the calling dropdown to add and select
	 * the new option.
	 */
	public static function ajax_quick_create() {
		check_ajax_referer( self::QUICK_CREATE_NONCE_ACTION, 'nonce' );

		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_send_json_error( array( 'message' => 'You do not have permission to do this.' ) );
		}

		$name = trim( sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) ) );
		if ( '' === $name ) {
			wp_send_json_error( array( 'message' => 'Name is required.' ) );
		}

		$new_id = wp_insert_post( array(
			'post_type'   => 'tc_instructor',
			'post_title'  => $name,
			'post_content'=> wp_kses_post( wp_unslash( $_POST['bio'] ?? '' ) ),
			'post_status' => 'publish',
		) );

		if ( is_wp_error( $new_id ) ) {
			wp_send_json_error( array( 'message' => 'Could not create this person.' ) );
		}

		TCNexus_Post_Types::set_person_role( $new_id, sanitize_key( $_POST['role'] ?? 'instructor' ) );

		if ( ! empty( $_POST['photo_id'] ) ) {
			set_post_thumbnail( $new_id, absint( $_POST['photo_id'] ) );
		}

		wp_send_json_success( array( 'id' => $new_id, 'title' => $name ) );
	}

	public static function handle_delete_instructor() {
		$instructor_id = isset( $_GET['instructor_id'] ) ? absint( $_GET['instructor_id'] ) : 0;

		if ( ! $instructor_id || ! check_admin_referer( 'tcnexus_delete_instructor_' . $instructor_id ) ) {
			wp_die( 'Invalid request.' );
		}

		if ( ! current_user_can( 'delete_post', $instructor_id ) || 'tc_instructor' !== get_post_type( $instructor_id ) ) {
			wp_die( 'You do not have permission to delete this instructor.' );
		}

		wp_trash_post( $instructor_id );

		wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&deleted=1' ) );
		exit;
	}
}
