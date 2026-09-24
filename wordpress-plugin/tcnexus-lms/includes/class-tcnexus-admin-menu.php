<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_Admin_Menu {

	public static function register() {
		add_menu_page(
			'Membership',
			'Membership',
			'list_users',
			'tcnexus-membership',
			array( __CLASS__, 'render_membership_page' ),
			'dashicons-groups',
			26
		);
		add_submenu_page( 'edit.php?post_type=tc_course', 'Media Library', 'Media Library', 'upload_files', 'tcnexus-media-library', array( __CLASS__, 'render_media_library_page' ) );
		TCNexus_Animations_Settings::register();
	}

	public static function redirect_native_media_library() {
		global $pagenow;
		if ( 'upload.php' === $pagenow && current_user_can( 'upload_files' ) && empty( $_GET['page'] ) ) {
			wp_safe_redirect( admin_url( 'admin.php?page=tcnexus-media-library&folder=unsorted' ) );
			exit;
		}
	}

	public static function ajax_media_items() {
		check_ajax_referer( 'tcnexus_media_library', 'nonce' );
		if ( ! current_user_can( 'upload_files' ) ) { wp_send_json_error( array( 'message' => 'Permission denied.' ), 403 ); }
		$folder = sanitize_key( $_POST['folder'] ?? 'unsorted' );
		$valid = wp_list_pluck( TCNexus_Media_Library::get_folders(), 'key' );
		if ( ! in_array( $folder, $valid, true ) ) { $folder = 'unsorted'; }
		$items = get_posts( array( 'post_type' => 'attachment', 'post_status' => 'inherit', 'posts_per_page' => -1, 'orderby' => 'date', 'order' => 'DESC', 'meta_key' => TCNexus_Media_Library::FOLDER_META_KEY, 'meta_value' => $folder ) );
		wp_send_json_success( array( 'folders' => TCNexus_Media_Library::get_folders(), 'selected' => $folder, 'items' => array_values( array_map( function ( $item ) { return array( 'id' => $item->ID, 'title' => $item->post_title, 'url' => wp_get_attachment_image_url( $item->ID, 'medium' ), 'type' => strtoupper( pathinfo( get_attached_file( $item->ID ), PATHINFO_EXTENSION ) ?: 'FILE' ) ); }, $items ) ) ) );
	}

	public static function ajax_move_media() {
		check_ajax_referer( 'tcnexus_media_library', 'nonce' );
		if ( ! current_user_can( 'upload_files' ) ) { wp_send_json_error( array( 'message' => 'Permission denied.' ), 403 ); }
		$attachment_id = absint( $_POST['attachment_id'] ?? 0 );
		$folder = sanitize_key( $_POST['folder'] ?? 'unsorted' );
		$valid = wp_list_pluck( TCNexus_Media_Library::get_folders(), 'key' );
		if ( ! $attachment_id || 'attachment' !== get_post_type( $attachment_id ) || ! in_array( $folder, $valid, true ) ) { wp_send_json_error( array( 'message' => 'Invalid media move.' ), 400 ); }
		TCNexus_Media_Library::assign_attachment( $attachment_id, $folder );
		wp_send_json_success();
	}

	public static function ajax_media_details() {
		check_ajax_referer( 'tcnexus_media_library', 'nonce' );
		$attachment_id = absint( $_POST['attachment_id'] ?? 0 );
		$item = get_post( $attachment_id );
		if ( ! current_user_can( 'upload_files' ) || ! $item || 'attachment' !== $item->post_type ) { wp_send_json_error( array( 'message' => 'Media not found.' ), 404 ); }
		$meta = wp_get_attachment_metadata( $attachment_id );
		$file = get_attached_file( $attachment_id );
		wp_send_json_success( array( 'title' => $item->post_title, 'url' => wp_get_attachment_image_url( $attachment_id, 'large' ), 'file_url' => wp_get_attachment_url( $attachment_id ), 'type' => strtoupper( pathinfo( $file, PATHINFO_EXTENSION ) ?: 'FILE' ), 'dimensions' => ! empty( $meta['width'] ) && ! empty( $meta['height'] ) ? $meta['width'] . ' × ' . $meta['height'] . ' px' : '—', 'size' => $file && file_exists( $file ) ? size_format( filesize( $file ) ) : '—', 'date' => mysql2date( 'M j, Y g:i a', $item->post_date ), 'folder' => TCNexus_Media_Library::folder_label( TCNexus_Media_Library::attachment_folder_key( $attachment_id ) ) ) );
	}

	public static function ajax_delete_media() {
		check_ajax_referer( 'tcnexus_media_library', 'nonce' );
		if ( ! current_user_can( 'delete_posts' ) && ! current_user_can( 'upload_files' ) ) { wp_send_json_error( array( 'message' => 'Permission denied.' ), 403 ); }
		$attachment_id = absint( $_POST['attachment_id'] ?? 0 );
		if ( ! $attachment_id || 'attachment' !== get_post_type( $attachment_id ) ) { wp_send_json_error( array( 'message' => 'Media not found.' ), 404 ); }
		if ( ! wp_delete_attachment( $attachment_id, true ) ) { wp_send_json_error( array( 'message' => 'Media could not be deleted.' ), 500 ); }
		wp_send_json_success();
	}

	public static function enqueue_media_library_assets( $hook ) {
		if ( false === strpos( $hook, '_page_tcnexus-media-library' ) ) { return; }
		wp_enqueue_media();
		wp_enqueue_style( 'tcnexus-media-library', TCNEXUS_LMS_URL . 'assets/media-library.css', array(), TCNEXUS_LMS_VERSION );
		wp_enqueue_style( 'tcnexus-media-library-interactions', TCNEXUS_LMS_URL . 'assets/media-library-interactions.css', array( 'tcnexus-media-library' ), TCNEXUS_LMS_VERSION );
		wp_enqueue_script( 'tcnexus-media-library', TCNEXUS_LMS_URL . 'assets/media-library.js', array(), TCNEXUS_LMS_VERSION, true );
	}

	public static function render_media_library_page() {
		if ( ! current_user_can( 'upload_files' ) ) { return; }
		TCNexus_Media_Library::organize_existing_media();
		$selected = sanitize_key( $_GET['folder'] ?? 'unsorted' );
		$search = sanitize_text_field( wp_unslash( $_GET['s'] ?? '' ) );
		$folders = TCNexus_Media_Library::get_folders();
		$folder_keys = wp_list_pluck( $folders, 'key' );
		if ( ! in_array( $selected, $folder_keys, true ) ) { $selected = 'unsorted'; }
		$args = array( 'post_type' => 'attachment', 'post_status' => 'inherit', 'posts_per_page' => -1, 'orderby' => 'date', 'order' => 'DESC', 'meta_key' => TCNexus_Media_Library::FOLDER_META_KEY, 'meta_value' => $selected );
		if ( $search ) { $args['s'] = $search; }
		$media = get_posts( $args );
		$selected_label = TCNexus_Media_Library::folder_label( $selected );
		wp_localize_script( 'tcnexus-media-library', 'tcnexusMediaLibraryData', array( 'nonce' => wp_create_nonce( 'tcnexus_media_library' ), 'items' => wp_list_pluck( $media, 'ID' ) ) );
		?>
		<div class="wrap tcn-media-library-wrap">
			<div class="tcn-media-library-header"><div><p class="tcn-media-library-eyebrow">Asset organization</p><h1>Media Library</h1><p class="tcn-media-library-subtitle">Keep every Course, Show, and profile asset easy to find.</p></div><button type="button" class="button tcn-media-library-upload" id="tcn-media-library-upload">Upload Media</button></div>
			<div class="tcn-media-library-shell">
				<aside class="tcn-media-library-sidebar" aria-label="Media folders"><a class="tcn-media-folder <?php echo 'unsorted' === $selected ? 'is-active' : ''; ?>" href="<?php echo esc_url( admin_url( 'admin.php?page=tcnexus-media-library&folder=unsorted' ) ); ?>">▰ <span>Unsorted</span></a><p class="tcn-media-folder-heading">Courses</p><?php foreach ( $folders as $folder ) : if ( 'courses' !== $folder['group'] ) { continue; } ?><a class="tcn-media-folder <?php echo $folder['key'] === $selected ? 'is-active' : ''; ?>" href="<?php echo esc_url( admin_url( 'admin.php?page=tcnexus-media-library&folder=' . rawurlencode( $folder['key'] ) ) ); ?>">▰ <span><?php echo esc_html( $folder['label'] ); ?></span></a><?php endforeach; ?><p class="tcn-media-folder-heading">Shows</p><?php foreach ( $folders as $folder ) : if ( 'shows' !== $folder['group'] ) { continue; } ?><a class="tcn-media-folder <?php echo $folder['key'] === $selected ? 'is-active' : ''; ?>" href="<?php echo esc_url( admin_url( 'admin.php?page=tcnexus-media-library&folder=' . rawurlencode( $folder['key'] ) ) ); ?>">▰ <span><?php echo esc_html( $folder['label'] ); ?></span></a><?php endforeach; ?><p class="tcn-media-folder-heading">People</p><?php foreach ( $folders as $folder ) : if ( 'people' !== $folder['group'] ) { continue; } ?><a class="tcn-media-folder <?php echo $folder['key'] === $selected ? 'is-active' : ''; ?>" href="<?php echo esc_url( admin_url( 'admin.php?page=tcnexus-media-library&folder=' . rawurlencode( $folder['key'] ) ) ); ?>">▰ <span><?php echo esc_html( $folder['label'] ); ?></span></a><?php endforeach; ?></aside>
				<main class="tcn-media-library-content"><div class="tcn-media-library-toolbar"><div><p class="tcn-media-library-breadcrumb">Media Library / <?php echo esc_html( $selected_label ); ?></p><h2><?php echo esc_html( $selected_label ); ?></h2><span><?php echo esc_html( count( $media ) ); ?> items</span></div><form method="get"><input type="hidden" name="page" value="tcnexus-media-library" /><input type="hidden" name="folder" value="<?php echo esc_attr( $selected ); ?>" /><input type="search" name="s" value="<?php echo esc_attr( $search ); ?>" placeholder="Search media…" /></form></div><div class="tcn-media-library-grid"><?php foreach ( $media as $item ) : $image = wp_get_attachment_image_url( $item->ID, 'medium' ); ?><article class="tcn-media-library-item"><?php if ( $image ) : ?><img src="<?php echo esc_url( $image ); ?>" alt="" /><?php else : ?><div class="tcn-media-library-item__empty">No preview</div><?php endif; ?><div class="tcn-media-library-item__meta"><strong><?php echo esc_html( $item->post_title ); ?></strong><span><?php echo esc_html( strtoupper( pathinfo( get_attached_file( $item->ID ), PATHINFO_EXTENSION ) ?: 'FILE' ) ); ?></span></div></article><?php endforeach; ?><?php if ( ! $media ) : ?><div class="tcn-media-library-empty">This folder is empty.</div><?php endif; ?></div></main>
			</div>
		</div>
		<?php
	}

	public static function render_membership_page() {
		if ( ! current_user_can( 'list_users' ) ) {
			return;
		}

		$users      = get_users( array( 'orderby' => 'registered', 'order' => 'DESC' ) );
		$free_limit = (int) get_option( 'tcnexus_free_limit', 5 );
		$registered_count = 0;
		$paid_count       = 0;
		foreach ( $users as $user ) {
			if ( 'paid' === TCNexus_Membership::get_user_tier( $user->ID ) ) {
				++$paid_count;
			} else {
				++$registered_count;
			}
		}
		?>
		<div class="wrap tcn-membership-wrap">
			<div class="tcn-membership-header">
				<div>
					<p class="tcn-membership-eyebrow">Access management</p>
					<h1>Membership</h1>
					<p class="tcn-membership-subtitle">Manage access rules and member tiers across the TC Nexus library.</p>
				</div>
			</div>

			<?php if ( isset( $_GET['saved'] ) ) : ?>
				<div class="notice notice-success is-dismissible"><p>Saved.</p></div>
			<?php endif; ?>

			<section class="tcn-membership-settings" aria-labelledby="tcn-membership-settings-title">
				<div class="tcn-membership-settings__copy">
					<h2 id="tcn-membership-settings-title">Free lesson limit</h2>
					<p>How many free-tier lessons an anonymous visitor can watch before they're asked to register.</p>
				</div>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="tcn-membership-settings__form">
					<input type="hidden" name="action" value="tcnexus_set_free_limit" />
					<?php wp_nonce_field( 'tcnexus_set_free_limit' ); ?>
					<label for="tcn-membership-free-limit">Lessons</label>
					<input id="tcn-membership-free-limit" type="number" min="0" name="free_limit" value="<?php echo esc_attr( $free_limit ); ?>" />
					<button type="submit" class="button tcn-membership-button">Save limit</button>
				</form>
			</section>

			<div class="tcn-membership-stats" aria-label="Membership summary">
				<div class="tcn-membership-stat"><strong><?php echo esc_html( count( $users ) ); ?></strong><span>Total users</span></div>
				<div class="tcn-membership-stat"><strong><?php echo esc_html( $registered_count ); ?></strong><span>Registered</span></div>
				<div class="tcn-membership-stat tcn-membership-stat--paid"><strong><?php echo esc_html( $paid_count ); ?></strong><span>Paid members</span></div>
			</div>

			<section class="tcn-membership-table-card" aria-labelledby="tcn-membership-users-title">
				<div class="tcn-membership-table-card__header"><div><p class="tcn-membership-eyebrow">Audience</p><h2 id="tcn-membership-users-title">Users</h2></div><span><?php echo esc_html( count( $users ) ); ?> accounts</span></div>
			<table class="widefat striped tcn-membership-table">
				<thead>
					<tr>
						<th>User</th>
						<th>Email</th>
						<th>Current Tier</th>
						<th>Set Tier</th>
					</tr>
				</thead>
				<tbody>
					<?php foreach ( $users as $user ) : ?>
						<?php $tier = TCNexus_Membership::get_user_tier( $user->ID ); ?>
						<tr>
							<td class="tcn-membership-table__user"><strong><?php echo esc_html( $user->user_login ); ?></strong><span>Joined <?php echo esc_html( mysql2date( 'M j, Y', $user->user_registered ) ); ?></span></td>
							<td class="tcn-membership-table__email"><?php echo esc_html( $user->user_email ); ?></td>
							<td><span class="tcn-membership-tier tcn-membership-tier--<?php echo esc_attr( $tier ); ?>"><?php echo esc_html( ucfirst( $tier ) ); ?></span></td>
							<td class="tcn-membership-table__actions">
								<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
									<input type="hidden" name="action" value="tcnexus_set_tier" />
									<input type="hidden" name="user_id" value="<?php echo esc_attr( $user->ID ); ?>" />
									<?php wp_nonce_field( 'tcnexus_set_tier_' . $user->ID ); ?>
									<input type="hidden" name="tier" value="<?php echo esc_attr( $tier ); ?>" data-initial-tier="<?php echo esc_attr( $tier ); ?>" />
									<div class="tcn-membership-tier-picker" data-tier-picker>
										<button type="button" class="tcn-membership-tier-picker__trigger" aria-haspopup="listbox" aria-expanded="false" data-tier-trigger><?php echo esc_html( ucfirst( $tier ) ); ?><span aria-hidden="true">⌄</span></button>
										<div class="tcn-membership-tier-picker__menu" role="listbox" hidden>
											<button type="button" role="option" class="tcn-membership-tier-picker__option" data-tier-option="registered" aria-selected="<?php echo 'registered' === $tier ? 'true' : 'false'; ?>">Registered</button>
											<button type="button" role="option" class="tcn-membership-tier-picker__option" data-tier-option="paid" aria-selected="<?php echo 'paid' === $tier ? 'true' : 'false'; ?>">Paid</button>
										</div>
									</div>
									<button type="submit" class="button" disabled="disabled">Update tier</button>
								</form>
							</td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
			</section>
		</div>
		<?php
	}

	public static function handle_set_tier() {
		$user_id = isset( $_POST['user_id'] ) ? absint( $_POST['user_id'] ) : 0;

		if ( ! current_user_can( 'list_users' ) ||
			! isset( $_POST['_wpnonce'] ) ||
			! wp_verify_nonce( $_POST['_wpnonce'], 'tcnexus_set_tier_' . $user_id ) ) {
			wp_die( 'Invalid request.' );
		}

		$tier = isset( $_POST['tier'] ) ? sanitize_key( $_POST['tier'] ) : '';
		TCNexus_Membership::set_user_tier( $user_id, $tier );

		wp_safe_redirect( admin_url( 'admin.php?page=tcnexus-membership' ) );
		exit;
	}

	public static function handle_set_free_limit() {
		if ( ! current_user_can( 'list_users' ) ||
			! isset( $_POST['_wpnonce'] ) ||
			! wp_verify_nonce( $_POST['_wpnonce'], 'tcnexus_set_free_limit' ) ) {
			wp_die( 'Invalid request.' );
		}

		$limit = isset( $_POST['free_limit'] ) ? absint( $_POST['free_limit'] ) : 5;
		update_option( 'tcnexus_free_limit', $limit );

		wp_safe_redirect( admin_url( 'admin.php?page=tcnexus-membership&saved=1' ) );
		exit;
	}
}
