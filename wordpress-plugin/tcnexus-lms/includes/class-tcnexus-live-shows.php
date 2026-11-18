<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/** Admin list and media editor for the separate Live Shows catalogue. */
class TCNexus_Live_Shows {
 const PAGE = 'tcnexus-live-shows';
 const CALENDAR_PAGE = 'tcnexus-calendar';

 public static function register() {
  add_menu_page( 'Calendar', 'Calendar', 'edit_posts', self::CALENDAR_PAGE, array( __CLASS__, 'render_calendar' ), 'dashicons-calendar-alt', 2.9 );
  $hook = add_menu_page( 'Live Show Builder', 'Live Shows', 'edit_posts', self::PAGE, array( 'TCNexus_Live_Show_Builder', 'render' ), 'dashicons-video-alt3', 3.0 );
  add_action( 'load-' . $hook, array( 'TCNexus_Live_Show_Builder', 'maybe_create_show' ) );
 }

 public static function render_calendar() {
  if ( ! current_user_can( 'edit_posts' ) ) { wp_die( 'You do not have permission to view the calendar.' ); }
  $shows = get_posts( array( 'post_type' => 'tc_live_show', 'post_status' => array( 'publish', 'draft' ), 'numberposts' => -1, 'meta_key' => '_tcnexus_live_start_date', 'orderby' => 'meta_value', 'order' => 'ASC' ) );
  ?>
  <div class="wrap tcn-builder-wrap"><div class="tcn-header"><div class="tcn-header__title-row"><p class="tcn-header__eyebrow">Schedule overview</p><h1>Calendar</h1></div><div class="tcn-header__actions"><a class="tcn-btn-ghost" href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE . '&new=1' ) ); ?>">＋ Add Live Show</a></div></div>
  <p>Live Shows are the source of truth for this calendar. Add or edit events from Live Shows.</p>
  <?php if ( ! $shows ) : ?><div class="tcn-live-empty">No scheduled Live Shows yet.</div><?php else : ?><div class="tcn-course-table-wrap"><table class="tcn-course-table tcn-course-table--detail"><thead><tr><th>Live Show</th><th>Status</th><th>Date</th><th>Time</th><th>Actions</th></tr></thead><tbody><?php foreach ( $shows as $show ) : ?><tr><td><strong><?php echo esc_html( $show->post_title ?: 'Untitled Live Show' ); ?></strong></td><td><?php echo esc_html( get_post_meta( $show->ID, '_tcnexus_live_status', true ) ?: 'LIVE SOON' ); ?></td><td><?php echo esc_html( get_post_meta( $show->ID, '_tcnexus_live_start_date', true ) ?: 'Not scheduled' ); ?></td><td><?php echo esc_html( get_post_meta( $show->ID, '_tcnexus_live_start_time', true ) ?: '—' ); ?></td><td><a class="tcn-course-table__edit" href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::PAGE . '&course_id=' . $show->ID ) ); ?>">Edit Live Show</a></td></tr><?php endforeach; ?></tbody></table></div><?php endif; ?></div>
  <?php
 }

 public static function enqueue_assets( $hook ) {
  if ( false !== strpos( $hook, self::CALENDAR_PAGE ) ) {
   wp_enqueue_style( 'tcnexus-live-show-builder', TCNEXUS_LMS_URL . 'assets/live-show-builder.css', array(), TCNEXUS_LMS_VERSION );
   return;
  }
  if ( false === strpos( $hook, self::PAGE ) ) { return; }
  wp_enqueue_media();
  wp_enqueue_style( 'tcnexus-live-show-builder', TCNEXUS_LMS_URL . 'assets/live-show-builder.css', array(), TCNEXUS_LMS_VERSION . '.' . filemtime( TCNEXUS_LMS_DIR . 'assets/live-show-builder.css' ) );
  wp_enqueue_script( 'tcnexus-crop-rect', TCNEXUS_LMS_URL . 'assets/crop-rect.js', array(), TCNEXUS_LMS_VERSION . '.' . filemtime( TCNEXUS_LMS_DIR . 'assets/crop-rect.js' ), true );
  wp_enqueue_script( 'tcnexus-navigation-guard', TCNEXUS_LMS_URL . 'assets/navigation-guard.js', array(), TCNEXUS_LMS_VERSION . '.' . filemtime( TCNEXUS_LMS_DIR . 'assets/navigation-guard.js' ), true );
  wp_enqueue_script( 'tcnexus-live-show-builder', TCNEXUS_LMS_URL . 'assets/live-show-builder.js', array( 'tcnexus-crop-rect', 'tcnexus-navigation-guard' ), TCNEXUS_LMS_VERSION . '.' . filemtime( TCNEXUS_LMS_DIR . 'assets/live-show-builder.js' ), true );
  TCNexus_Media::localize( 'tcnexus-live-show-builder' );
 }

}
