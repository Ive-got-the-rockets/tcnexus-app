<?php
/**
 * Plugin Name: TC Nexus LMS
 * Description: Headless course/lesson backend for the TC Nexus streaming site — tiers, gating, and the REST API the Angular front-end consumes.
 * Version: 0.1.54
 * Author: TC Nexus
 * Text Domain: tcnexus-lms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'TCNEXUS_LMS_VERSION', '0.1.54' );
define( 'TCNEXUS_LMS_DIR', plugin_dir_path( __FILE__ ) );
define( 'TCNEXUS_LMS_URL', plugin_dir_url( __FILE__ ) );
define( 'TCNEXUS_LMS_TABLE_VIEWS', 'tcnexus_lesson_views' );

require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-activator.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-post-types.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-membership.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-registration-settings.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-animations-settings.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-visitor-tracking.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-access-control.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-rest-api.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-admin-menu.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-course-builder.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-global-lessons.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-instructor-builder.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-character-builder.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-admin-theme.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-media.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-profile-placeholders.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-media-library.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-cors.php';

register_activation_hook( __FILE__, array( 'TCNexus_Activator', 'activate' ) );

add_action( 'init', array( 'TCNexus_Post_Types', 'register' ) );
add_action( 'init', array( 'TCNexus_Course_Builder', 'maybe_migrate_course_levels' ), 20 );
add_action( 'init', array( 'TCNexus_Course_Builder', 'maybe_migrate_show_seasons' ), 21 );
add_action( 'rest_api_init', array( 'TCNexus_REST_API', 'register_routes' ) );
add_action( 'admin_menu', array( 'TCNexus_Admin_Menu', 'register' ), 20 );
add_action( 'admin_init', array( 'TCNexus_Admin_Menu', 'redirect_native_media_library' ) );
add_action( 'admin_enqueue_scripts', array( 'TCNexus_Admin_Menu', 'enqueue_media_library_assets' ) );
add_action( 'wp_ajax_tcnexus_media_library_items', array( 'TCNexus_Admin_Menu', 'ajax_media_items' ) );
add_action( 'wp_ajax_tcnexus_media_library_move', array( 'TCNexus_Admin_Menu', 'ajax_move_media' ) );
add_action( 'wp_ajax_tcnexus_media_library_details', array( 'TCNexus_Admin_Menu', 'ajax_media_details' ) );
add_action( 'wp_ajax_tcnexus_media_library_delete', array( 'TCNexus_Admin_Menu', 'ajax_delete_media' ) );
add_action( 'admin_post_tcnexus_save_card_animation_settings', array( 'TCNexus_Animations_Settings', 'handle_save' ) );
add_action( 'admin_menu', array( 'TCNexus_Registration_Settings', 'register' ), 21 );
add_action( 'admin_menu', array( 'TCNexus_Visitor_Tracking', 'register' ), 22 );
add_action( 'admin_post_tcnexus_save_registration_settings', array( 'TCNexus_Registration_Settings', 'handle_save' ) );
add_action( 'admin_post_tcnexus_set_tier', array( 'TCNexus_Admin_Menu', 'handle_set_tier' ) );
add_action( 'admin_post_tcnexus_set_free_limit', array( 'TCNexus_Admin_Menu', 'handle_set_free_limit' ) );
add_action( 'admin_post_tcnexus_clear_visitor_tracker', array( 'TCNexus_Visitor_Tracking', 'handle_clear' ) );
add_action( 'admin_post_tcnexus_clear_anonymous_trackers', array( 'TCNexus_Visitor_Tracking', 'handle_clear_all' ) );
add_action( 'admin_post_tcnexus_reset_test_session', array( 'TCNexus_Visitor_Tracking', 'handle_reset_test_session' ) );
add_action( 'admin_post_tcnexus_save_tracking_settings', array( 'TCNexus_Visitor_Tracking', 'handle_save_tracking_settings' ) );
add_action( 'admin_menu', array( 'TCNexus_Course_Builder', 'register' ), 20 );
add_action( 'admin_post_tcnexus_save_course', array( 'TCNexus_Course_Builder', 'handle_save' ) );
add_action( 'admin_post_tcnexus_delete_course', array( 'TCNexus_Course_Builder', 'handle_delete_course' ) );
add_action( 'admin_post_tcnexus_save_show', array( 'TCNexus_Course_Builder', 'handle_save' ) );
add_action( 'admin_post_tcnexus_delete_show', array( 'TCNexus_Course_Builder', 'handle_delete_course' ) );
add_action( 'admin_enqueue_scripts', array( 'TCNexus_Course_Builder', 'enqueue_assets' ) );
add_action( 'admin_menu', array( 'TCNexus_Global_Lessons', 'register' ), 20 );
add_action( 'admin_enqueue_scripts', array( 'TCNexus_Global_Lessons', 'enqueue_assets' ) );
add_action( 'wp_ajax_tcnexus_save_global_lesson', array( 'TCNexus_Global_Lessons', 'ajax_save_lesson' ) );
add_action( 'wp_ajax_tcnexus_set_global_lesson_tier', array( 'TCNexus_Global_Lessons', 'ajax_set_lesson_tier' ) );
add_action( 'wp_ajax_tcnexus_delete_global_lesson', array( 'TCNexus_Global_Lessons', 'ajax_delete_lesson' ) );
add_action( 'admin_menu', array( 'TCNexus_Instructor_Builder', 'register' ), 20 );
add_action( 'admin_post_tcnexus_save_instructor', array( 'TCNexus_Instructor_Builder', 'handle_save' ) );
add_action( 'admin_post_tcnexus_delete_instructor', array( 'TCNexus_Instructor_Builder', 'handle_delete_instructor' ) );
add_action( 'wp_ajax_tcnexus_quick_create_person', array( 'TCNexus_Instructor_Builder', 'ajax_quick_create' ) );
add_action( 'admin_enqueue_scripts', array( 'TCNexus_Instructor_Builder', 'enqueue_assets' ) );
add_action( 'admin_menu', array( 'TCNexus_Character_Builder', 'register' ), 20 );
add_action( 'admin_post_tcnexus_save_character', array( 'TCNexus_Character_Builder', 'handle_save' ) );
add_action( 'admin_post_tcnexus_delete_character', array( 'TCNexus_Character_Builder', 'handle_delete' ) );
add_action( 'admin_enqueue_scripts', array( 'TCNexus_Character_Builder', 'enqueue_assets' ) );
add_action( 'admin_enqueue_scripts', array( 'TCNexus_Admin_Theme', 'enqueue_assets' ) );
add_action( 'wp_ajax_tcnexus_crop_image', array( 'TCNexus_Media', 'ajax_crop_image' ) );
add_action( 'rest_api_init', array( 'TCNexus_CORS', 'register' ), 15 );
