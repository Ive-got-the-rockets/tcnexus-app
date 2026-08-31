<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class TCNexus_REST_API {

	const NAMESPACE_ = 'tcnexus/v1';

	public static function register_routes() {
		register_rest_route( self::NAMESPACE_, '/courses', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'get_courses' ),
			'permission_callback' => '__return_true',
		) );

		register_rest_route( self::NAMESPACE_, '/courses/(?P<id>\d+)', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'get_course' ),
			'permission_callback' => '__return_true',
		) );

		register_rest_route( self::NAMESPACE_, '/lessons/(?P<id>\d+)', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'get_lesson' ),
			'permission_callback' => '__return_true',
		) );

		register_rest_route( self::NAMESPACE_, '/access/check', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'check_access' ),
			'permission_callback' => '__return_true',
			'args'                => array(
				'lesson_id' => array( 'required' => true, 'type' => 'integer' ),
			),
		) );

		register_rest_route( self::NAMESPACE_, '/register', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'register_email' ),
			'permission_callback' => '__return_true',
			'args'                => array(
				'email' => array( 'required' => true, 'type' => 'string' ),
			),
		) );

		register_rest_route( self::NAMESPACE_, '/registration-settings', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'get_registration_settings' ),
			'permission_callback' => '__return_true',
		) );

		register_rest_route( self::NAMESPACE_, '/login', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'login' ),
			'permission_callback' => '__return_true',
			'args'                => array(
				'email'    => array( 'required' => true, 'type' => 'string' ),
				'password' => array( 'required' => true, 'type' => 'string' ),
			),
		) );
	}

	private static function get_visitor_id( \WP_REST_Request $request ) {
		return sanitize_text_field( (string) $request->get_header( 'X-Visitor-Id' ) );
	}

	private static function get_user_id( \WP_REST_Request $request ) {
		$token = sanitize_text_field( (string) $request->get_header( 'X-Tcnexus-Token' ) );
		return TCNexus_Membership::get_user_id_from_token( $token );
	}

	public static function get_courses() {
		$courses = get_posts( array(
			'post_type'      => 'tc_course',
			'posts_per_page' => -1,
			'orderby'        => 'title',
			'order'          => 'ASC',
		) );

		$data = array_map( function ( $course ) {
			$types    = wp_get_post_terms( $course->ID, 'course_type', array( 'fields' => 'names' ) );
			// _tcnexus_image_desktop_id ("Course Image", Course Builder's Media
			// tab) is a much higher-res image than the post thumbnail — the
			// catalog grid cards use "thumbnail" (small, fine at card size),
			// but the featured hero banner needs "image" or it stretches the
			// small thumbnail across the full page width and looks pixelated.
			$image_id = (int) get_post_meta( $course->ID, '_tcnexus_image_desktop_id', true );
			return array(
				'id'            => $course->ID,
				'title'         => $course->post_title,
				'excerpt'       => get_the_excerpt( $course ),
				'thumbnail'     => get_the_post_thumbnail_url( $course->ID, 'medium' ),
				'image'         => $image_id ? wp_get_attachment_image_url( $image_id, 'full' ) : null,
				'course_types'  => is_wp_error( $types ) ? array() : $types,
				'lesson_count'  => self::count_course_lessons( $course->ID ),
				'overview_link' => get_post_meta( $course->ID, '_tcnexus_overview_link', true ) ?: null,
			);
		}, $courses );

		return new WP_REST_Response( $data, 200 );
	}

	public static function get_course( \WP_REST_Request $request ) {
		$course_id = (int) $request['id'];
		$course    = get_post( $course_id );

		if ( ! $course || 'tc_course' !== $course->post_type ) {
			return new WP_Error( 'not_found', 'Course not found', array( 'status' => 404 ) );
		}

		$lessons = self::get_course_lessons( $course_id );
		$types   = wp_get_post_terms( $course->ID, 'course_type', array( 'fields' => 'names' ) );

		// _tcnexus_image_desktop_id ("Course Image" in Course Builder's Media
		// tab, the main image for this single page) is a different field from
		// the post thumbnail ("Course Thumbnail", used for catalog cards) —
		// this endpoint used to only ever return the latter, so a course
		// image uploaded there never showed up anywhere on the frontend.
		$image_id = (int) get_post_meta( $course_id, '_tcnexus_image_desktop_id', true );

		return new WP_REST_Response( array(
			'id'            => $course->ID,
			'title'         => $course->post_title,
			'content'       => apply_filters( 'the_content', $course->post_content ),
			'thumbnail'     => get_the_post_thumbnail_url( $course->ID, 'large' ),
			'image'         => $image_id ? wp_get_attachment_image_url( $image_id, 'full' ) : null,
			'course_types'  => is_wp_error( $types ) ? array() : $types,
			'overview_link' => get_post_meta( $course_id, '_tcnexus_overview_link', true ) ?: null,
			'instructor'    => self::format_person( (int) get_post_meta( $course_id, '_tcnexus_instructor_id', true ) ),
			'guest'         => self::format_person( (int) get_post_meta( $course_id, '_tcnexus_guest_id', true ) ),
			'lessons'       => $lessons,
		), 200 );
	}

	/** Instructor/Guest are both just tc_instructor posts (see TCNexus_Post_Types::get_person_role) — null if the course has none set for that role. */
	private static function format_person( $person_id ) {
		if ( ! $person_id ) {
			return null;
		}
		$person = get_post( $person_id );
		if ( ! $person || 'tc_instructor' !== $person->post_type ) {
			return null;
		}
		return array(
			'id'    => $person->ID,
			'name'  => $person->post_title,
			'photo' => get_the_post_thumbnail_url( $person->ID, 'medium' ) ?: null,
		);
	}

	public static function get_lesson( \WP_REST_Request $request ) {
		$lesson_id = (int) $request['id'];
		$lesson    = get_post( $lesson_id );

		if ( ! $lesson || 'tc_lesson' !== $lesson->post_type ) {
			return new WP_Error( 'not_found', 'Episode not found', array( 'status' => 404 ) );
		}

		return new WP_REST_Response( self::format_lesson( $lesson, false ), 200 );
	}

	public static function check_access( \WP_REST_Request $request ) {
		$lesson_id  = (int) $request->get_param( 'lesson_id' );
		$lesson     = get_post( $lesson_id );

		if ( ! $lesson || 'tc_lesson' !== $lesson->post_type ) {
			return new WP_Error( 'not_found', 'Episode not found', array( 'status' => 404 ) );
		}

		$visitor_id = self::get_visitor_id( $request );
		$user_id    = self::get_user_id( $request );

		$result = TCNexus_Access_Control::evaluate_access( $lesson_id, $visitor_id, $user_id );
		$result['viewer_tier'] = TCNexus_Membership::get_user_tier( $user_id );

		if ( $result['granted'] ) {
			$result['vimeo_id'] = get_post_meta( $lesson_id, '_tcnexus_vimeo_id', true );
		}

		return new WP_REST_Response( $result, 200 );
	}

	public static function login( \WP_REST_Request $request ) {
		$email    = sanitize_email( (string) $request->get_param( 'email' ) );
		$password = (string) $request->get_param( 'password' );
		$result   = TCNexus_Membership::login_from_email( $email, $password );

		if ( is_wp_error( $result ) ) {
			return new WP_Error( $result->get_error_code(), $result->get_error_message(), array( 'status' => 401 ) );
		}

		return new WP_REST_Response( array(
			'success' => true,
			'token'   => $result['token'],
		), 200 );
	}

	public static function register_email( \WP_REST_Request $request ) {
		$email  = sanitize_email( (string) $request->get_param( 'email' ) );
		$result = TCNexus_Membership::register_from_email( $email );

		if ( is_wp_error( $result ) ) {
			return new WP_Error( $result->get_error_code(), $result->get_error_message(), array( 'status' => 409 ) );
		}

		$visitor_id = self::get_visitor_id( $request );
		$ip         = TCNexus_Access_Control::get_visitor_ip();
		TCNexus_Access_Control::attach_anonymous_history_to_user( $visitor_id, $ip, $result['user_id'] );

		return new WP_REST_Response( array(
			'success' => true,
			'token'   => $result['token'],
		), 201 );
	}

	public static function get_registration_settings() {
		return new WP_REST_Response( TCNexus_Registration_Settings::get_public_settings(), 200 );
	}

	private static function count_course_lessons( $course_id ) {
		$query = new WP_Query( array(
			'post_type'      => 'tc_lesson',
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'meta_key'       => '_tcnexus_course_id',
			'meta_value'     => $course_id,
		) );
		return (int) $query->found_posts;
	}

	private static function get_course_lessons( $course_id ) {
		$lessons = get_posts( array(
			'post_type'      => 'tc_lesson',
			'posts_per_page' => -1,
			'meta_key'       => '_tcnexus_course_id',
			'meta_value'     => $course_id,
			'orderby'        => 'menu_order',
			'order'          => 'ASC',
		) );

		return array_map( function ( $lesson ) {
			return self::format_lesson( $lesson, true );
		}, $lessons );
	}

	private static function format_lesson( $lesson, $minimal ) {
		$tier = TCNexus_Post_Types::get_lesson_tier( $lesson->ID );
		$data = array(
			'id'         => $lesson->ID,
			'title'      => $lesson->post_title,
			'order'      => (int) $lesson->menu_order,
			'tier'       => $tier,
			'course_id'  => (int) get_post_meta( $lesson->ID, '_tcnexus_course_id', true ),
			'thumbnail'  => get_the_post_thumbnail_url( $lesson->ID, 'medium' ),
			'locked'     => 'paid' === $tier,
			'excerpt'    => get_the_excerpt( $lesson ),
			// Course Builder actually saves the id under _tcnexus_vimeo_id (plus
			// a separate _tcnexus_video_source of 'vimeo'/'youtube') — this used
			// to read a _tcnexus_video_url meta key that's never written
			// anywhere, so video_url was always null for every real lesson.
			// The frontend player only knows how to embed Vimeo right now (see
			// parseVimeoRef() in lesson-player.ts), so a youtube-sourced
			// lesson's id is still returned here for API honesty, but won't
			// actually play until the player gains a youtube provider too.
			'video_url'  => get_post_meta( $lesson->ID, '_tcnexus_vimeo_id', true ) ?: null,
		);

		if ( ! $minimal ) {
			$data['content'] = apply_filters( 'the_content', $lesson->post_content );
		}

		return $data;
	}
}
