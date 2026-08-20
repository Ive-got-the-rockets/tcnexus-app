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
			),
			'public'       => false,
			// No native admin UI — lessons are fully managed from the Course
			// Builder's Lessons tab (a lesson only ever makes sense in the
			// context of its course), so a standalone WordPress-styled
			// editor screen would just be a redundant, inconsistent surface.
			'show_ui'      => false,
			'show_in_rest' => true,
			'rest_base'    => 'tc_lesson',
			'supports'     => array( 'title', 'editor', 'thumbnail', 'page-attributes' ),
		) );

		register_post_type( 'tc_instructor', array(
			// One shared pool of people — the same profile (name/photo/bio)
			// can be picked as a course's Instructor or as its Guest, so the
			// menu/labels describe both roles instead of just one.
			'label'        => 'Instructors & Guests',
			'labels'       => array(
				'name'          => 'Instructors & Guests',
				'singular_name' => 'Instructor/Guest',
				'add_new_item'  => 'Add New Instructor/Guest',
				'edit_item'     => 'Edit Instructor/Guest',
				'all_items'     => 'Instructors & Guests',
			),
			'public'       => false,
			'show_ui'      => true,
			'show_in_menu' => 'edit.php?post_type=tc_course',
			'show_in_rest' => true,
			'rest_base'    => 'tc_instructor',
			'supports'     => array( 'title', 'editor', 'thumbnail' ),
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
		// Only two tiers are ever assigned to a lesson directly. "Registered"
		// isn't a per-lesson tag — it's what a free lesson effectively
		// becomes for a visitor who has used up their free-view allowance
		// (see TCNexus_Access_Control), not a choice made when creating the
		// lesson.
		if ( ! in_array( $tier, array( 'free', 'paid' ), true ) ) {
			return;
		}
		wp_set_object_terms( $lesson_id, $tier, 'access_tier', false );
	}

	/**
	 * A tc_instructor post is either an "instructor" or a "guest" — the same
	 * profile shape (name/photo/bio), just tagged for which dropdown it
	 * belongs in on the course. Defaults to 'instructor' for any profile
	 * created before this distinction existed.
	 */
	public static function get_person_role( $person_id ) {
		$role = get_post_meta( $person_id, '_tcnexus_person_role', true );
		return 'guest' === $role ? 'guest' : 'instructor';
	}

	public static function set_person_role( $person_id, $role ) {
		update_post_meta( $person_id, '_tcnexus_person_role', 'guest' === $role ? 'guest' : 'instructor' );
	}
}
