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
		self::$hook_suffix = add_menu_page(
			'Instructors / Hosts & Guests',
			'Instructors / Hosts & Guests',
			'edit_posts',
			self::PAGE_SLUG,
			array( __CLASS__, 'render' ),
			'dashicons-groups',
			3.35
		);

		add_action( 'load-' . self::$hook_suffix, array( __CLASS__, 'maybe_create_instructor' ) );
		add_action( 'load-' . self::$hook_suffix, array( __CLASS__, 'set_page_title' ) );
		add_action( 'load-edit.php', array( __CLASS__, 'redirect_instructor_list' ) );
		add_action( 'load-post-new.php', array( __CLASS__, 'redirect_instructor_new' ) );
		add_action( 'load-post.php', array( __CLASS__, 'redirect_instructor_edit' ) );
	}

	public static function set_page_title() {
		global $title;
		$title = 'Instructors / Hosts & Guests';
	}

	public static function maybe_create_instructor() {
		if ( ! isset( $_GET['new'] ) || '1' !== $_GET['new'] ) {
			return;
		}
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( 'You do not have permission to access this page.' );
		}

		$role = isset( $_GET['role'] ) && in_array( $_GET['role'], array( 'guest', 'host' ), true ) ? sanitize_key( $_GET['role'] ) : 'instructor';

		$role = sanitize_key( $_POST['role'] ?? ( $_GET['role'] ?? 'instructor' ) );
		$is_character = 'character' === $role;
		$new_id = wp_insert_post( array(
			'post_type'   => $is_character ? 'tc_character' : 'tc_instructor',
			'post_title'  => 'guest' === $role ? 'Untitled Guest' : ( 'host' === $role ? 'Untitled Host' : 'Untitled Instructor' ),
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
			'tcnexus-crop-rect',
			TCNEXUS_LMS_URL . 'assets/crop-rect.js',
			array(),
			TCNEXUS_LMS_VERSION,
			true
		);
		wp_enqueue_script(
			'tcnexus-course-builder',
			TCNEXUS_LMS_URL . 'assets/course-builder.js',
			array( 'tcnexus-crop-rect' ),
			TCNEXUS_LMS_VERSION,
			true
		);
		wp_enqueue_script(
			'tcnexus-profile-builder-guard',
			TCNEXUS_LMS_URL . 'assets/profile-builder-guard.js',
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
		$hosts       = array();
		$guests      = array();
		foreach ( $people as $person ) {
			$role = TCNexus_Post_Types::get_person_role( $person->ID );
			if ( 'guest' === $role ) {
				$guests[] = $person;
			} elseif ( 'host' === $role ) {
				$hosts[] = $person;
			} else {
				$instructors[] = $person;
			}
		}
		?>
		<div class="wrap tcn-list-wrap">
			<div class="tcn-list-header">
			<h1>Instructors / Hosts &amp; Guests</h1>
			</div>

			<div class="tcn-person-section tcn-person-section--hosts">
				<div class="tcn-list-header tcn-list-header--sub">
					<h2>Hosts</h2>
					<button type="button" class="tcn-add-course-btn" data-add-person-modal-role="host">+ Add New Host</button>
				</div>
				<?php self::render_person_cards( $hosts, 'Untitled Host' ); ?>
			</div>

			<?php if ( isset( $_GET['deleted'] ) ) : ?>
				<div class="tcn-notice tcn-notice--success" style="margin-bottom:18px;">Person moved to trash.</div>
			<?php endif; ?>

			<div class="tcn-person-section">
				<div class="tcn-list-header tcn-list-header--sub">
					<h2>Instructors</h2>
					<button type="button" class="tcn-add-course-btn" data-add-person-modal-role="instructor">+ Add New Instructor</button>
				</div>
				<?php self::render_person_cards( $instructors, 'Untitled Instructor' ); ?>
			</div>

			<div class="tcn-person-section tcn-person-section--guests">
				<div class="tcn-list-header tcn-list-header--sub tcn-list-header--guests">
					<h2>Guests</h2>
					<button type="button" class="tcn-add-course-btn" data-add-person-modal-role="guest">+ Add New Guest</button>
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

			<div class="tcn-modal-backdrop" id="tcn-add-host-modal" aria-hidden="true">
				<div class="tcn-modal tcn-modal--center tcn-add-host-modal" role="dialog" aria-modal="true" aria-labelledby="tcn-add-person-title">
					<button type="button" class="tcn-modal__close" id="tcn-add-person-modal-close" aria-label="Close">×</button>
					<h2 id="tcn-add-person-title">Add New Host</h2>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
						<input type="hidden" name="action" value="tcnexus_create_host_modal" />
						<?php wp_nonce_field( 'tcnexus_create_host_modal', 'tcnexus_create_host_nonce' ); ?>
						<div class="tcn-field"><label class="tcn-field__label" for="tcn-modal-person-name">Name</label><input type="text" id="tcn-modal-person-name" name="person_name" required /></div>
						<hr class="tcn-add-host-divider" />
						<div class="tcn-field"><label class="tcn-field__label">Role</label><div class="tcn-pill-toggle"><input type="radio" id="tcn-modal-role-instructor" name="person_role" value="instructor" /><label for="tcn-modal-role-instructor">Instructor</label><input type="radio" id="tcn-modal-role-host" name="person_role" value="host" checked /><label for="tcn-modal-role-host">Host</label><input type="radio" id="tcn-modal-role-guest" name="person_role" value="guest" /><label for="tcn-modal-role-guest">Guest</label></div></div>
						<div class="tcn-field"><label class="tcn-field__label">Photo</label><?php self::render_media_picker( 'host_photo_id', 0, 'Select photo' ); ?></div>
						<div class="tcn-field"><label class="tcn-field__label" for="tcn-modal-person-bio">Bio</label><textarea class="tcn-host-bio-input" id="tcn-modal-person-bio" name="person_bio" rows="6" placeholder="Write a short bio…"></textarea></div>
						<div class="tcn-modal__actions"><button type="button" class="tcn-btn-ghost" id="tcn-add-person-modal-cancel">Cancel</button><button type="submit" class="tcn-btn-ghost tcn-add-host-submit" id="tcn-add-person-submit">Add Host</button></div>
					</form>
				</div>
			</div>
			<script>
				(function () { var modal = document.getElementById('tcn-add-host-modal'), close = function () { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); document.body.classList.remove('tcn-host-modal-open'); }; if (!modal) return; document.querySelectorAll('[data-add-person-modal-role]').forEach(function (open) { open.addEventListener('click', function () { var role = open.getAttribute('data-add-person-modal-role'), label = role === 'guest' ? 'Guest' : (role === 'instructor' ? 'Instructor' : 'Host'); modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); document.body.classList.add('tcn-host-modal-open'); document.getElementById('tcn-add-person-title').textContent = 'Add New ' + label; document.getElementById('tcn-add-person-submit').textContent = 'Add ' + label; document.getElementById('tcn-modal-role-' + role).checked = true; document.getElementById('tcn-modal-person-name').focus(); }); }); document.getElementById('tcn-add-person-modal-close').addEventListener('click', close); document.getElementById('tcn-add-person-modal-cancel').addEventListener('click', close); modal.addEventListener('click', function (event) { if (event.target === modal) close(); }); }());
			</script>
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
				$photo      = get_the_post_thumbnail_url( $person->ID, 'medium' ) ?: TCNexus_Profile_Placeholders::get_saved_url( $person->ID );
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

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="tcn-profile-builder-form">
				<input type="hidden" name="action" value="tcnexus_save_instructor" />
				<input type="hidden" name="instructor_id" value="<?php echo esc_attr( $instructor_id ); ?>" />
				<input type="hidden" name="new_flow" value="<?php echo $new_flow ? '1' : '0'; ?>" />
				<?php wp_nonce_field( 'tcnexus_instructor_builder', 'tcnexus_instructor_builder_nonce' ); ?>

				<div id="tcnexus-builder">
					<div class="tcn-header">
						<div class="tcn-header__title-row">
							<p class="tcn-header__eyebrow"><?php echo 'guest' === $role ? 'Guest' : ( 'host' === $role ? 'Host' : 'Instructor' ); ?></p>
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
								<input type="radio" id="role_host" name="role" value="host" <?php checked( $role, 'host' ); ?> />
								<label for="role_host">Host</label>
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

			<div class="tcn-modal-backdrop" id="tcn-profile-unsaved-modal">
				<div class="tcn-modal tcn-unsaved-modal" role="alertdialog" aria-modal="true" aria-labelledby="tcn-profile-unsaved-title" aria-describedby="tcn-profile-unsaved-message">
					<div class="tcn-unsaved-modal__icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path class="tcn-unsaved-modal__triangle" d="M10.9 4.5a1.25 1.25 0 0 1 2.2 0l8 14.2a1.25 1.25 0 0 1-1.1 1.8H4a1.25 1.25 0 0 1-1.1-1.8l8-14.2Z" /><path class="tcn-unsaved-modal__mark" d="M12 9v5m0 3.2v.1" /></svg></div>
					<h2 id="tcn-profile-unsaved-title">You are leaving without saving changes</h2>
					<p id="tcn-profile-unsaved-message">This profile has unsaved changes. Would you like to save it before leaving?</p>
					<div class="tcn-modal__actions"><button type="button" class="tcn-btn-ghost" id="tcn-profile-unsaved-cancel">Cancel</button><button type="button" class="tcn-btn-ghost" id="tcn-profile-unsaved-discard">Discard</button><button type="button" class="tcn-save-btn" id="tcn-profile-unsaved-save">Save</button></div>
				</div>
			</div>

			<?php if ( $auto_reset ) : ?>
				<!-- Rendered already-open (no JS involved) and with no
				     dismiss handler wired to it anywhere — the only way off
				     this screen is one of the two explicit choices. -->
				<div class="tcn-modal-backdrop is-open" id="tcn-instructor-saved-modal">
					<div class="tcn-modal tcn-modal--center">
						<h2><?php echo 'guest' === $role ? 'Guest Added' : ( 'host' === $role ? 'Host Added' : 'Instructor Added' ); ?></h2>
						<p>What would you like to do next?</p>
						<div class="tcn-modal__actions tcn-profile-saved-actions">
							<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE_SLUG ) ); ?>" class="tcn-btn-ghost">Back To All Instructors / Hosts &amp; Guests</a>
							<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&new=1&role=' . $role ) ); ?>" class="tcn-btn-ghost">Add New <?php echo 'guest' === $role ? 'Guest' : ( 'host' === $role ? 'Host' : 'Instructor' ); ?></a>
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

		$photo_id = absint( $_POST['photo_id'] ?? 0 );
		if ( $photo_id ) {
			set_post_thumbnail( $instructor_id, $photo_id );
			TCNexus_Media_Library::assign_attachment( $photo_id, 'guest' === sanitize_key( $_POST['role'] ?? 'instructor' ) ? 'guests' : 'instructors' );
			TCNexus_Profile_Placeholders::clear( $instructor_id );
		} else {
			delete_post_thumbnail( $instructor_id );
			TCNexus_Profile_Placeholders::assign_if_missing( $instructor_id );
		}

		$redirect = admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&instructor_id=' . $instructor_id . '&saved=1' );
		if ( ! empty( $_POST['new_flow'] ) && '1' === $_POST['new_flow'] ) {
			$redirect .= '&new_flow=1';
		}

		wp_safe_redirect( $redirect );
		exit;
	}

	public static function handle_create_host_modal() {
		if ( ! current_user_can( 'edit_posts' ) || ! isset( $_POST['tcnexus_create_host_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['tcnexus_create_host_nonce'] ) ), 'tcnexus_create_host_modal' ) ) { wp_die( 'Invalid request.' ); }
		$name = sanitize_text_field( wp_unslash( $_POST['person_name'] ?? $_POST['host_name'] ?? '' ) );
		$bio = wp_kses_post( wp_unslash( $_POST['person_bio'] ?? $_POST['host_bio'] ?? '' ) );
		$photo_id = absint( $_POST['host_photo_id'] ?? 0 );
		$role = in_array( sanitize_key( $_POST['person_role'] ?? $_POST['host_role'] ?? 'host' ), array( 'instructor', 'host', 'guest' ), true ) ? sanitize_key( $_POST['person_role'] ?? $_POST['host_role'] ?? 'host' ) : 'host';
		if ( '' !== $name ) {
			$id = wp_insert_post( array( 'post_type' => 'tc_instructor', 'post_title' => $name, 'post_content' => $bio, 'post_status' => 'publish' ), true );
			if ( ! is_wp_error( $id ) ) { TCNexus_Post_Types::set_person_role( $id, $role ); if ( $photo_id ) { set_post_thumbnail( $id, $photo_id ); TCNexus_Media_Library::assign_attachment( $photo_id, 'guest' === $role ? 'guests' : 'instructors' ); TCNexus_Profile_Placeholders::clear( $id ); } else { TCNexus_Profile_Placeholders::assign_if_missing( $id ); } }
		}
		$return_url = ! empty( $_POST['return_url'] ) ? esc_url_raw( wp_unslash( $_POST['return_url'] ) ) : admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&created=1' );
		$redirect_args = array( 'created' => '1' );
		if ( ! empty( $id ) && ! is_wp_error( $id ) ) {
			$redirect_args['created_person_id'] = absint( $id );
			$redirect_args['created_person_role'] = $role;
		}
		wp_safe_redirect( add_query_arg( $redirect_args, $return_url ) ); exit;
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

		$role = sanitize_key( $_POST['role'] ?? 'instructor' );
		$is_character = 'character' === $role;
		$new_id = wp_insert_post( array(
			'post_type'   => $is_character ? 'tc_character' : 'tc_instructor',
			'post_title'  => $name,
			'post_content'=> wp_kses_post( wp_unslash( $_POST['bio'] ?? '' ) ),
			'post_status' => 'publish',
		) );

		if ( is_wp_error( $new_id ) ) {
			wp_send_json_error( array( 'message' => 'Could not create this person.' ) );
		}

		if ( ! $is_character ) {
			TCNexus_Post_Types::set_person_role( $new_id, $role );
		}

		$photo_id = absint( $_POST['photo_id'] ?? 0 );
		if ( $photo_id ) {
			set_post_thumbnail( $new_id, $photo_id );
			TCNexus_Media_Library::assign_attachment( $photo_id, 'guest' === $role ? 'guests' : 'instructors' );
		} else {
			TCNexus_Profile_Placeholders::assign_if_missing( $new_id );
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
