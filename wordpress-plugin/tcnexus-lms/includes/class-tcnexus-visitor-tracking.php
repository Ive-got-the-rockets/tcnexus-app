<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_Visitor_Tracking {

	public static function register() {
		add_submenu_page(
			'tcnexus-membership',
			'Visitor Tracking',
			'Visitor Tracking',
			'list_users',
			'tcnexus-visitor-tracking',
			array( __CLASS__, 'render_page' )
		);
	}

	private static function table() {
		global $wpdb;
		return $wpdb->prefix . TCNEXUS_LMS_TABLE_VIEWS;
	}

	private static function get_rows() {
		global $wpdb;
		$table = self::table();
		$rows  = array();

		$anonymous = $wpdb->get_results( "SELECT visitor_id, ip_address, COUNT(DISTINCT CASE WHEN tier = 'free' THEN lesson_id END) AS free_lessons, MAX(viewed_at) AS last_seen FROM {$table} WHERE user_id = 0 GROUP BY visitor_id, ip_address ORDER BY last_seen DESC" );
		foreach ( $anonymous as $row ) {
			$rows[] = array(
				'key'          => 'anonymous:' . $row->visitor_id . ':' . $row->ip_address,
				'name'         => '',
				'email'        => '',
				'visitor_id'   => $row->visitor_id,
				'ip'           => $row->ip_address,
				'free_lessons' => (int) $row->free_lessons,
				'last_seen'    => $row->last_seen,
				'status'       => 'Not Registered',
				'status_class' => 'tcnexus-status-anonymous',
				'clearable'    => true,
			);
		}

		$users = get_users( array( 'orderby' => 'registered', 'order' => 'DESC' ) );
		foreach ( $users as $user ) {
			$view = $wpdb->get_row( $wpdb->prepare( "SELECT ip_address, MAX(viewed_at) AS last_seen FROM {$table} WHERE user_id = %d GROUP BY ip_address ORDER BY last_seen DESC LIMIT 1", $user->ID ) );
			$name = trim( $user->first_name . ' ' . $user->last_name );
			$rows[] = array(
				'key'          => 'user:' . $user->ID,
				'name'         => $name,
				'email'        => $user->user_email,
				'visitor_id'   => '',
				'ip'           => $view ? $view->ip_address : '',
				'free_lessons' => null,
				'last_seen'    => $view ? $view->last_seen : $user->user_registered,
				'status'       => 'paid' === TCNexus_Membership::get_user_tier( $user->ID ) ? 'Member' : 'Registered',
				'status_class' => 'paid' === TCNexus_Membership::get_user_tier( $user->ID ) ? 'tcnexus-status-member' : 'tcnexus-status-registered',
				'clearable'    => false,
			);
		}

		usort( $rows, function ( $a, $b ) {
			return strcmp( $b['last_seen'], $a['last_seen'] );
		} );
		return $rows;
	}

	public static function render_page() {
		if ( ! current_user_can( 'list_users' ) ) {
			return;
		}
		$rows = self::get_rows();
		$anonymous_count = count( array_filter( $rows, function ( $row ) { return $row['clearable']; } ) );
		?>
		<div class="wrap tcn-membership-wrap">
			<div class="tcn-membership-header">
				<div>
					<p class="tcn-membership-eyebrow">Membership</p>
					<h1>Visitor &amp; Member Tracking</h1>
					<p class="tcn-membership-subtitle">See who is watching, how they are registered, and clear anonymous viewing history when needed.</p>
				</div>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="tcn-membership-header__action">
					<input type="hidden" name="action" value="tcnexus_clear_anonymous_trackers" />
					<?php wp_nonce_field( 'tcnexus_clear_anonymous_trackers' ); ?>
					<button type="submit" class="button tcn-membership-button" <?php disabled( 0 === $anonymous_count ); ?>>Clear All Anonymous Trackers</button>
				</form>
			</div>
			<?php if ( isset( $_GET['cleared'] ) ) : ?>
				<div class="notice notice-success is-dismissible"><p>Anonymous tracker cleared.</p></div>
			<?php endif; ?>
			<?php if ( isset( $_GET['cleared_all'] ) ) : ?>
				<div class="notice notice-success is-dismissible"><p>All anonymous trackers cleared.</p></div>
			<?php endif; ?>
			<?php if ( isset( $_GET['reset_test_session'] ) ) : ?>
				<div class="notice notice-success is-dismissible"><p>Test session reset. Anonymous history and the browser session were cleared.</p></div>
			<?php endif; ?>
			<div class="tcn-membership-summary">
				<p>Registered users are identified by their email. Names appear when users add them to their profile. Clearing trackers affects anonymous viewing history only.</p>
				<div class="tcn-membership-summary__counts"><strong><?php echo esc_html( count( $rows ) ); ?></strong> tracked visitors <span aria-hidden="true">·</span> <strong><?php echo esc_html( $anonymous_count ); ?></strong> anonymous trackers available to clear</div>
			</div>
			<div class="tcn-test-reset-card">
				<div>
					<strong>Reset Test Session</strong>
					<p>Clears all anonymous viewing history and removes the test browser token, email, and visitor ID. Registered and member accounts are not affected.</p>
				</div>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" onsubmit="return confirm('Reset the anonymous test session? This clears all anonymous viewing history.');">
					<input type="hidden" name="action" value="tcnexus_reset_test_session" />
					<?php wp_nonce_field( 'tcnexus_reset_test_session' ); ?>
					<button type="submit" class="button tcn-test-reset-button">Reset Test Session</button>
				</form>
			</div>
			<div class="tcn-membership-table-card">
			<table class="widefat striped tcn-membership-table">
				<thead><tr><th>Visitor / IP</th><th>Last seen</th><th>Free lessons</th><th>Registration</th><th>Action</th></tr></thead>
				<tbody>
				<?php if ( empty( $rows ) ) : ?><tr><td colspan="5">No visitors have been tracked yet.</td></tr><?php endif; ?>
				<?php foreach ( $rows as $row ) : ?>
					<tr>
						<td>
							<?php if ( $row['name'] ) : ?><strong><?php echo esc_html( $row['name'] ); ?></strong><br /><?php endif; ?>
							<?php if ( $row['email'] ) : ?><span><?php echo esc_html( $row['email'] ); ?></span><br /><?php endif; ?>
							<code><?php echo esc_html( $row['ip'] ?: 'IP unavailable' ); ?></code>
							<?php if ( $row['visitor_id'] ) : ?><br /><small>Visitor <?php echo esc_html( substr( $row['visitor_id'], 0, 8 ) ); ?>&hellip;</small><?php endif; ?>
						</td>
						<td><?php echo esc_html( $row['last_seen'] ); ?></td>
						<td><?php echo null === $row['free_lessons'] ? '&mdash;' : esc_html( $row['free_lessons'] ); ?></td>
						<td><span class="<?php echo esc_attr( $row['status_class'] ); ?>"><?php echo esc_html( $row['status'] ); ?></span></td>
						<td>
							<?php if ( $row['clearable'] ) : ?>
								<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
									<input type="hidden" name="action" value="tcnexus_clear_visitor_tracker" />
									<input type="hidden" name="visitor_id" value="<?php echo esc_attr( $row['visitor_id'] ); ?>" />
									<input type="hidden" name="ip_address" value="<?php echo esc_attr( $row['ip'] ); ?>" />
									<?php wp_nonce_field( 'tcnexus_clear_visitor_tracker' ); ?>
									<button type="submit" class="button">Clear Tracker</button>
								</form>
							<?php else : ?><span aria-disabled="true">Not available</span><?php endif; ?>
						</td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
			</div>
		</div>
		<?php
	}

	public static function handle_clear() {
		if ( ! current_user_can( 'list_users' ) || ! isset( $_POST['_wpnonce'] ) || ! wp_verify_nonce( $_POST['_wpnonce'], 'tcnexus_clear_visitor_tracker' ) ) {
			wp_die( 'Invalid request.' );
		}
		global $wpdb;
		$visitor_id = sanitize_text_field( wp_unslash( $_POST['visitor_id'] ?? '' ) );
		$ip_address = sanitize_text_field( wp_unslash( $_POST['ip_address'] ?? '' ) );
		if ( '' === $visitor_id && '' === $ip_address ) {
			wp_die( 'A visitor identifier is required.' );
		}
		if ( $visitor_id && $ip_address ) {
			$wpdb->query( $wpdb->prepare( 'DELETE FROM ' . self::table() . ' WHERE user_id = 0 AND visitor_id = %s AND ip_address = %s', $visitor_id, $ip_address ) );
		} elseif ( $visitor_id ) {
			$wpdb->query( $wpdb->prepare( 'DELETE FROM ' . self::table() . ' WHERE user_id = 0 AND visitor_id = %s', $visitor_id ) );
		} else {
			$wpdb->query( $wpdb->prepare( 'DELETE FROM ' . self::table() . ' WHERE user_id = 0 AND ip_address = %s', $ip_address ) );
		}
		wp_safe_redirect( admin_url( 'admin.php?page=tcnexus-visitor-tracking&cleared=1' ) );
		exit;
	}

	public static function handle_clear_all() {
		if ( ! current_user_can( 'list_users' ) || ! isset( $_POST['_wpnonce'] ) || ! wp_verify_nonce( $_POST['_wpnonce'], 'tcnexus_clear_anonymous_trackers' ) ) {
			wp_die( 'Invalid request.' );
		}
		global $wpdb;
		$wpdb->query( 'DELETE FROM ' . self::table() . ' WHERE user_id = 0' );
		wp_safe_redirect( admin_url( 'admin.php?page=tcnexus-visitor-tracking&cleared_all=1' ) );
		exit;
	}

	public static function handle_reset_test_session() {
		if ( ! current_user_can( 'list_users' ) || ! isset( $_POST['_wpnonce'] ) || ! wp_verify_nonce( $_POST['_wpnonce'], 'tcnexus_reset_test_session' ) ) {
			wp_die( 'Invalid request.' );
		}

		global $wpdb;
		$wpdb->query( 'DELETE FROM ' . self::table() . ' WHERE user_id = 0' );

		$frontend_url = apply_filters( 'tcnexus_frontend_url', 'https://dev.tcnexus.tv' );
		$reset_url   = add_query_arg( 'tcnexus_reset', '1', $frontend_url );
		// This intentionally redirects to the separately hosted frontend so it
		// can clear that origin's localStorage session.
		wp_redirect( esc_url_raw( $reset_url ) );
		exit;
	}
}
