<?php
/**
 * Plugin Name: TC Nexus LMS
 * Description: Headless course/lesson backend for the TC Nexus streaming site — tiers, gating, and the REST API the Angular front-end consumes.
 * Version: 0.1.0
 * Author: TC Nexus
 * Text Domain: tcnexus-lms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'TCNEXUS_LMS_VERSION', '0.1.0' );
define( 'TCNEXUS_LMS_DIR', plugin_dir_path( __FILE__ ) );
define( 'TCNEXUS_LMS_TABLE_VIEWS', 'tcnexus_lesson_views' );

require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-activator.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-post-types.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-meta-boxes.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-membership.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-access-control.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-rest-api.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-admin-menu.php';
require_once TCNEXUS_LMS_DIR . 'includes/class-tcnexus-cors.php';

register_activation_hook( __FILE__, array( 'TCNexus_Activator', 'activate' ) );

add_action( 'init', array( 'TCNexus_Post_Types', 'register' ) );
add_action( 'add_meta_boxes', array( 'TCNexus_Meta_Boxes', 'register' ) );
add_action( 'save_post_tc_lesson', array( 'TCNexus_Meta_Boxes', 'save' ) );
add_action( 'rest_api_init', array( 'TCNexus_REST_API', 'register_routes' ) );
add_action( 'admin_menu', array( 'TCNexus_Admin_Menu', 'register' ), 20 );
add_action( 'admin_post_tcnexus_set_tier', array( 'TCNexus_Admin_Menu', 'handle_set_tier' ) );
add_action( 'rest_api_init', array( 'TCNexus_CORS', 'register' ), 15 );
