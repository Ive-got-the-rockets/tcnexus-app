<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_Admin_Menu {

	public static function register() {
		add_submenu_page(
			'edit.php?post_type=tc_course',
			'Add New Type Of Course',
			'Add New Type Of Course',
			'manage_categories',
			'edit-tags.php?taxonomy=course_type&post_type=tc_course'
		);

		add_menu_page(
			'Membership',
			'Membership',
			'list_users',
			'tcnexus-membership',
			array( __CLASS__, 'render_membership_page' ),
			'dashicons-groups',
			26
		);
	}

	public static function render_membership_page() {
		if ( ! current_user_can( 'list_users' ) ) {
			return;
		}

		$users = get_users( array( 'orderby' => 'registered', 'order' => 'DESC' ) );
		?>
		<div class="wrap">
			<h1>Membership</h1>
			<table class="widefat striped">
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
							<td><?php echo esc_html( $user->user_login ); ?></td>
							<td><?php echo esc_html( $user->user_email ); ?></td>
							<td><?php echo esc_html( ucfirst( $tier ) ); ?></td>
							<td>
								<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
									<input type="hidden" name="action" value="tcnexus_set_tier" />
									<input type="hidden" name="user_id" value="<?php echo esc_attr( $user->ID ); ?>" />
									<?php wp_nonce_field( 'tcnexus_set_tier_' . $user->ID ); ?>
									<select name="tier">
										<option value="registered" <?php selected( $tier, 'registered' ); ?>>Registered</option>
										<option value="paid" <?php selected( $tier, 'paid' ); ?>>Paid</option>
									</select>
									<button type="submit" class="button">Update</button>
								</form>
							</td>
						</tr>
					<?php endforeach; ?>
				</tbody>
			</table>
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
}
