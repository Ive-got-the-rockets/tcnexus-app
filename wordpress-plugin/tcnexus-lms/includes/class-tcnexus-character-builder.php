<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Styled admin panel for reusable show-character profiles. Characters use
 * the same visual language and profile fields as Instructors & Guests, but
 * live in their own pool so Shows never mix the two kinds of people.
 */
class TCNexus_Character_Builder {

	const PAGE_SLUG = 'tcnexus-character-builder';

	private static $hook_suffix;

	public static function register() {
		self::$hook_suffix = add_submenu_page(
			TCNexus_Course_Builder::SHOW_PAGE_SLUG,
			'Characters',
			'Characters',
			'edit_posts',
			self::PAGE_SLUG,
			array( __CLASS__, 'render' )
		);

		add_action( 'load-' . self::$hook_suffix, array( __CLASS__, 'maybe_create' ) );
		add_action( 'load-' . self::$hook_suffix, array( __CLASS__, 'set_page_title' ) );
	}

	public static function set_page_title() {
		global $title;
		$title = 'Characters';
	}

	public static function maybe_create() {
		if ( ! isset( $_GET['new'] ) || '1' !== $_GET['new'] ) {
			return;
		}
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( 'You do not have permission to access this page.' );
		}

		$new_id = wp_insert_post( array(
			'post_type'   => 'tc_character',
			'post_title'  => 'Untitled Character',
			'post_status' => 'publish',
		) );
		if ( is_wp_error( $new_id ) ) {
			return;
		}
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&character_id=' . $new_id . '&new_flow=1' ) );
		exit;
	}

	public static function enqueue_assets( $hook ) {
		if ( $hook !== self::$hook_suffix ) {
			return;
		}
		wp_enqueue_media();
		wp_enqueue_style( 'tcnexus-builder-fonts', 'https://fonts.googleapis.com/css2?family=Fraunces:wght@300;400;500;600;700;900&family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap', array(), null );
		wp_enqueue_style( 'tcnexus-course-builder', TCNEXUS_LMS_URL . 'assets/course-builder.css', array(), TCNEXUS_LMS_VERSION );
		wp_enqueue_script( 'tcnexus-crop-rect', TCNEXUS_LMS_URL . 'assets/crop-rect.js', array(), TCNEXUS_LMS_VERSION, true );
		wp_enqueue_script( 'tcnexus-course-builder', TCNEXUS_LMS_URL . 'assets/course-builder.js', array( 'tcnexus-crop-rect' ), TCNEXUS_LMS_VERSION, true );
		wp_enqueue_script( 'tcnexus-profile-builder-guard', TCNEXUS_LMS_URL . 'assets/profile-builder-guard.js', array(), TCNEXUS_LMS_VERSION, true );
		TCNexus_Media::localize( 'tcnexus-course-builder' );
	}

	public static function render() {
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( 'You do not have permission to access this page.' );
		}
		$character_id = isset( $_GET['character_id'] ) ? absint( $_GET['character_id'] ) : 0;
		if ( $character_id ) {
			self::render_form( $character_id );
		} else {
			self::render_list();
		}
	}

	private static function render_list() {
		$characters = get_posts( array(
			'post_type'      => 'tc_character',
			'posts_per_page' => -1,
			'post_status'    => array( 'publish', 'draft' ),
			'orderby'        => 'title',
			'order'          => 'ASC',
		) );
		?>
		<div class="wrap tcn-list-wrap">
			<div class="tcn-list-header">
				<h1>Characters</h1>
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&new=1' ) ); ?>" class="tcn-add-course-btn">+ Add New Character</a>
			</div>
			<?php if ( isset( $_GET['deleted'] ) ) : ?><div class="tcn-notice tcn-notice--success" style="margin-bottom:18px;">Character moved to trash.</div><?php endif; ?>
			<?php if ( empty( $characters ) ) : ?>
				<p class="tcn-empty-note">No characters yet.</p>
			<?php else : ?>
				<div class="tcn-course-cards">
					<?php foreach ( $characters as $character ) :
						$edit_url = admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&character_id=' . $character->ID );
						$delete_url = wp_nonce_url( admin_url( 'admin-post.php?action=tcnexus_delete_character&character_id=' . $character->ID ), 'tcnexus_delete_character_' . $character->ID );
						$photo = get_the_post_thumbnail_url( $character->ID, 'medium' ) ?: TCNexus_Profile_Placeholders::get_saved_url( $character->ID );
					?>
					<div class="tcn-course-card">
						<a href="<?php echo esc_url( $edit_url ); ?>" class="tcn-course-card__link">
							<?php if ( $photo ) : ?><img src="<?php echo esc_url( $photo ); ?>" alt="" style="width:48px;height:48px;border-radius:50%;object-fit:cover;margin-bottom:12px;" /><?php endif; ?>
							<h2 class="tcn-course-card__title"><?php echo esc_html( $character->post_title ?: 'Untitled Character' ); ?></h2>
						</a>
						<button type="button" class="tcn-course-card__delete" data-delete-url="<?php echo esc_url( $delete_url ); ?>" data-course-title="<?php echo esc_attr( $character->post_title ?: 'Untitled Character' ); ?>" aria-label="Delete Character" title="Delete Character"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg></button>
					</div>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>
			<div class="tcn-modal-backdrop" id="tcn-delete-modal"><div class="tcn-modal" role="alertdialog" aria-modal="true" aria-labelledby="tcn-delete-modal-title"><h2 id="tcn-delete-modal-title">Delete this character?</h2><p id="tcn-delete-modal-message">Are you sure you want to delete this character?</p><div class="tcn-modal__actions"><button type="button" class="tcn-btn-ghost" id="tcn-delete-modal-cancel">Cancel</button><a href="#" class="tcn-btn-danger" id="tcn-delete-modal-confirm">Delete</a></div></div></div>
		</div>
		<?php
	}

	private static function render_form( $character_id ) {
		$character = get_post( $character_id );
		if ( ! $character || 'tc_character' !== $character->post_type ) {
			echo '<div class="wrap"><p>Character not found.</p></div>';
			return;
		}
		$photo_id = (int) get_post_thumbnail_id( $character_id );
		?>
		<div class="wrap tcn-builder-wrap">
			<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE_SLUG ) ); ?>" class="tcn-back-link"><span aria-hidden="true">&larr;</span> Back To All Characters</a>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="tcn-profile-builder-form">
				<input type="hidden" name="action" value="tcnexus_save_character" /><input type="hidden" name="character_id" value="<?php echo esc_attr( $character_id ); ?>" /><?php wp_nonce_field( 'tcnexus_character_builder', 'tcnexus_character_builder_nonce' ); ?>
				<div id="tcnexus-builder"><div class="tcn-header"><div class="tcn-header__title-row"><p class="tcn-header__eyebrow">Character</p><input type="text" id="character_name" name="character_name" class="tcn-title-input" value="<?php echo esc_attr( $character->post_title ); ?>" placeholder="Name" /></div><div class="tcn-header__actions"><button type="submit" class="tcn-save-btn">Save Character</button></div></div>
				<?php if ( isset( $_GET['saved'] ) ) : ?><div class="tcn-notice tcn-notice--success" style="margin:16px 32px 0;">Character saved.</div><?php endif; ?>
				<div class="tcn-panel is-active"><div class="tcn-field"><label class="tcn-field__label">Photo</label><div class="tcn-media-grid" style="grid-template-columns:minmax(220px,320px);"><?php TCNexus_Media::render_picker( 'Select Photo', 'photo_id', $photo_id, 'Select photo', 500, 500 ); ?></div></div><div class="tcn-field"><label class="tcn-field__label" for="character_bio">Bio</label><?php wp_editor( $character->post_content, 'character_bio', array( 'textarea_name' => 'character_bio', 'textarea_rows' => 8, 'media_buttons' => false ) ); ?></div></div></div>
			</form>
			<div class="tcn-modal-backdrop" id="tcn-profile-unsaved-modal"><div class="tcn-modal tcn-unsaved-modal" role="alertdialog" aria-modal="true" aria-labelledby="tcn-profile-unsaved-title" aria-describedby="tcn-profile-unsaved-message"><div class="tcn-unsaved-modal__icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path class="tcn-unsaved-modal__triangle" d="M10.9 4.5a1.25 1.25 0 0 1 2.2 0l8 14.2a1.25 1.25 0 0 1-1.1 1.8H4a1.25 1.25 0 0 1-1.1-1.8l8-14.2Z" /><path class="tcn-unsaved-modal__mark" d="M12 9v5m0 3.2v.1" /></svg></div><h2 id="tcn-profile-unsaved-title">You are leaving without saving changes</h2><p id="tcn-profile-unsaved-message">This profile has unsaved changes. Would you like to save it before leaving?</p><div class="tcn-modal__actions"><button type="button" class="tcn-btn-ghost" id="tcn-profile-unsaved-cancel">Cancel</button><button type="button" class="tcn-btn-ghost" id="tcn-profile-unsaved-discard">Discard</button><button type="button" class="tcn-save-btn" id="tcn-profile-unsaved-save">Save</button></div></div></div>
		</div>
		<?php
	}

	public static function handle_save() {
		if ( ! isset( $_POST['tcnexus_character_builder_nonce'] ) || ! wp_verify_nonce( $_POST['tcnexus_character_builder_nonce'], 'tcnexus_character_builder' ) ) {
			wp_die( 'Invalid request.' );
		}
		$character_id = isset( $_POST['character_id'] ) ? absint( $_POST['character_id'] ) : 0;
		if ( ! $character_id || ! current_user_can( 'edit_post', $character_id ) || 'tc_character' !== get_post_type( $character_id ) ) {
			wp_die( 'Invalid character.' );
		}
		wp_update_post( array( 'ID' => $character_id, 'post_title' => sanitize_text_field( wp_unslash( $_POST['character_name'] ?? '' ) ), 'post_content' => wp_kses_post( wp_unslash( $_POST['character_bio'] ?? '' ) ) ) );
		$photo_id = absint( $_POST['photo_id'] ?? 0 );
		if ( $photo_id ) { set_post_thumbnail( $character_id, $photo_id ); TCNexus_Media_Library::assign_attachment( $photo_id, 'characters' ); TCNexus_Profile_Placeholders::clear( $character_id ); } else { delete_post_thumbnail( $character_id ); TCNexus_Profile_Placeholders::assign_if_missing( $character_id ); }
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&character_id=' . $character_id . '&saved=1' ) );
		exit;
	}

	public static function handle_delete() {
		$character_id = isset( $_GET['character_id'] ) ? absint( $_GET['character_id'] ) : 0;
		if ( ! $character_id || ! check_admin_referer( 'tcnexus_delete_character_' . $character_id ) || ! current_user_can( 'delete_post', $character_id ) || 'tc_character' !== get_post_type( $character_id ) ) {
			wp_die( 'Invalid request.' );
		}
		wp_trash_post( $character_id );
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&deleted=1' ) );
		exit;
	}
}
