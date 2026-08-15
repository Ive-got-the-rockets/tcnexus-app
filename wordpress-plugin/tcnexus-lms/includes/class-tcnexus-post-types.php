<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_Post_Types {

	public static function register() {
		register_post_type( 'tc_course', array(
			'label'        => 'Courses',
			'labels'       => array(
				'name'          => 'Courses',
				'singular_name' => 'Course',
				'add_new_item'  => 'Add New Course',
				'edit_item'     => 'Edit Course',
			),
			'public'       => false,
			'show_ui'      => true,
			'show_in_menu' => true,
			'show_in_rest' => true,
			'rest_base'    => 'tc_course',
			'supports'     => array( 'title', 'editor', 'thumbnail' ),
			'menu_icon'    => 'dashicons-video-alt3',
		) );

		register_post_type( 'tc_lesson', array(
			'label'        => 'Episodes',
			'labels'       => array(
				'name'          => 'Episodes',
				'singular_name' => 'Episode',
				'add_new_item'  => 'Add New Episode',
				'edit_item'     => 'Edit Episode',
				'all_items'     => 'Episode List',
			),
			'public'       => false,
			'show_ui'      => true,
			'show_in_menu' => 'edit.php?post_type=tc_course',
			'show_in_rest' => true,
			'rest_base'    => 'tc_lesson',
			'supports'     => array( 'title', 'editor', 'thumbnail', 'page-attributes' ),
		) );

		register_taxonomy( 'course_type', 'tc_course', array(
			'label'             => 'Course Types',
			'hierarchical'      => true,
			'show_ui'           => true,
			'show_in_menu'      => true,
			'show_in_rest'      => true,
			'show_admin_column' => true,
			'rewrite'           => false,
		) );

		register_taxonomy( 'access_tier', 'tc_lesson', array(
			'label'             => 'Access Tier',
			'hierarchical'      => false,
			'show_ui'           => true,
			'show_in_menu'      => false,
			'show_in_rest'      => true,
			'show_admin_column' => true,
			'rewrite'           => false,
			'meta_box_cb'       => false,
		) );
	}

	public static function get_lesson_tier( $lesson_id ) {
		$terms = wp_get_post_terms( $lesson_id, 'access_tier', array( 'fields' => 'slugs' ) );
		if ( is_wp_error( $terms ) || empty( $terms ) ) {
			return 'free';
		}
		return $terms[0];
	}

	public static function set_lesson_tier( $lesson_id, $tier ) {
		if ( ! in_array( $tier, array( 'free', 'registered', 'paid' ), true ) ) {
			return;
		}
		wp_set_object_terms( $lesson_id, $tier, 'access_tier', false );
	}
}
