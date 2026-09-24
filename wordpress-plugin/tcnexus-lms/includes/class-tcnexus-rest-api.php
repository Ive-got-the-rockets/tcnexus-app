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

		register_rest_route( self::NAMESPACE_, '/shows', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'get_shows' ),
			'permission_callback' => '__return_true',
		) );

		register_rest_route( self::NAMESPACE_, '/session', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'session_status' ),
			'permission_callback' => '__return_true',
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
		return self::get_catalog_items( 'tc_course' );
	}

	public static function get_shows() {
		return self::get_catalog_items( 'tc_show' );
	}

	private static function get_catalog_items( $post_type ) {
		$items = get_posts( array(
			'post_type'      => $post_type,
			'posts_per_page' => -1,
			'orderby'        => 'title',
			'order'          => 'ASC',
		) );

		$data = array_map( function ( $course ) {
			$levels = self::format_course_levels( $course->ID );
			$languages = self::format_course_languages( $course->ID );
			$primary = self::primary_course_level( $levels );
			// _tcnexus_image_desktop_id ("Course Image", Course Builder's Media
			// tab) is a much higher-res image than the post thumbnail — the
			// catalog grid cards use "thumbnail" (small, fine at card size),
			// but the featured hero banner needs "image" or it stretches the
			// small thumbnail across the full page width and looks pixelated.
			$image_id = (int) get_post_meta( $course->ID, '_tcnexus_image_desktop_id', true );
			$landing_background_id = (int) get_post_meta( $course->ID, '_tcnexus_landing_background_id', true );
			$title_image_id = (int) get_post_meta( $course->ID, '_tcnexus_title_image_id', true );
			return array(
				'id'            => $course->ID,
				'title'         => $primary['title'] ?: $course->post_title,
				'excerpt'       => get_the_excerpt( $course ),
				'thumbnail'     => $primary['thumbnail'] ?: get_the_post_thumbnail_url( $course->ID, 'medium' ),
				'image'         => $primary['image'] ?: ( $image_id ? wp_get_attachment_image_url( $image_id, 'full' ) : null ),
				'landing_background' => $primary['landing_background'] ?: ( $landing_background_id ? wp_get_attachment_image_url( $landing_background_id, 'full' ) : null ),
				'title_image'   => $primary['title_image'] ?: ( $title_image_id ? wp_get_attachment_image_url( $title_image_id, 'full' ) : null ),
				'course_types'  => $primary['course_types'],
				'lesson_count'  => count( $primary['lessons'] ),
				'overview_link' => $primary['overview_link'] ?: null,
				'trailer_link'  => $primary['trailer_link'] ?: null,
				'configured_levels' => array_values( array_map( function ( $level ) { return $level['slug']; }, array_filter( $levels, function ( $level ) { return ! empty( $level['enabled'] ); } ) ) ),
				'levels'        => $levels,
				'languages'     => $languages,
			);
		}, $items );

		return new WP_REST_Response( $data, 200 );
	}

	public static function get_course( \WP_REST_Request $request ) {
		$course_id = (int) $request['id'];
		$course    = get_post( $course_id );

		if ( ! $course || ! in_array( $course->post_type, array( 'tc_course', 'tc_show' ), true ) ) {
			return new WP_Error( 'not_found', 'Course or show not found', array( 'status' => 404 ) );
		}

		$levels = self::format_course_levels( $course_id );
		$languages = self::format_course_languages( $course_id );
		$primary = self::primary_course_level( $levels );
		$is_show = 'tc_show' === $course->post_type;
		$seasons = $is_show ? self::format_course_seasons( $course_id ) : array();
		if ( $is_show && ! empty( $seasons ) ) {
			$primary = self::primary_course_level( $seasons );
		}

		// _tcnexus_image_desktop_id ("Course Image" in Course Builder's Media
		// tab, the main image for this single page) is a different field from
		// the post thumbnail ("Course Thumbnail", used for catalog cards) —
		// this endpoint used to only ever return the latter, so a course
		// image uploaded there never showed up anywhere on the frontend.
		$image_id = (int) get_post_meta( $course_id, '_tcnexus_image_desktop_id', true );
		$landing_background_id = (int) get_post_meta( $course_id, '_tcnexus_landing_background_id', true );
		$title_image_id = (int) get_post_meta( $course_id, '_tcnexus_title_image_id', true );

		$response = array(
			'id'            => $course->ID,
			'title'         => $primary['title'] ?: $course->post_title,
			'content'       => $primary['content'] ? apply_filters( 'the_content', $primary['content'] ) : apply_filters( 'the_content', $course->post_content ),
			'thumbnail'     => $primary['thumbnail'] ?: get_the_post_thumbnail_url( $course->ID, 'large' ),
			'image'         => $primary['image'] ?: ( $image_id ? wp_get_attachment_image_url( $image_id, 'full' ) : null ),
			'landing_background' => $primary['landing_background'] ?: ( $landing_background_id ? wp_get_attachment_image_url( $landing_background_id, 'full' ) : null ),
			'title_image'   => $primary['title_image'] ?: ( $title_image_id ? wp_get_attachment_image_url( $title_image_id, 'full' ) : null ),
			'course_types'  => $primary['course_types'],
			'overview_link' => $primary['overview_link'] ?: null,
			'trailer_link'  => $primary['trailer_link'] ?: null,
			'instructor'    => $primary['instructor'],
			'guest'         => $primary['guest'],
			'characters'    => self::format_characters( $course_id ),
			'lessons'       => $primary['lessons'],
			'configured_levels' => array_values( array_map( function ( $level ) { return $level['slug']; }, array_filter( $levels, function ( $level ) { return ! empty( $level['enabled'] ); } ) ) ),
			'levels'        => $levels,
			'languages'     => $languages,
		);
		if ( $is_show ) {
			$response['seasons'] = $seasons;
			$response['configured_seasons'] = array_values( array_map( function ( $season ) { return $season['season_key']; }, array_filter( $seasons, function ( $season ) { return ! empty( $season['enabled'] ); } ) ) );
		}
		return new WP_REST_Response( $response, 200 );
	}

	private static function primary_course_level( $levels ) {
		foreach ( $levels as $level ) {
			if ( ! empty( $level['enabled'] ) ) {
				return $level;
			}
		}
		return reset( $levels ) ?: array( 'title' => '', 'content' => '', 'course_types' => array(), 'overview_link' => '', 'trailer_link' => '', 'lessons' => array(), 'instructor' => null, 'guest' => null, 'image' => null, 'landing_background' => null, 'title_image' => null );
	}

	private static function format_course_levels( $course_id, $stored = null ) {
		$stored = is_array( $stored ) ? $stored : TCNexus_Course_Builder::get_course_levels( $course_id );
		$formatted = array();
		foreach ( $stored as $slug => $level ) {
			$lessons = self::get_course_lessons( $course_id, $slug );
			$formatted[ $slug ] = array(
				'enabled'       => ! empty( $level['enabled'] ),
				'slug'          => $slug,
				'season_key'    => 0 === strpos( (string) $slug, 'season-' ) ? $slug : null,
				'label'         => TCNexus_Course_Builder::level_label( $slug ),
				'title'         => (string) ( $level['title'] ?? '' ),
				'slug'          => (string) ( $level['course_slug'] ?? '' ),
				'content'       => (string) ( $level['content'] ?? '' ),
				'course_types'  => self::course_type_names( (array) ( $level['course_types'] ?? array() ) ),
				'lesson_count'  => count( $lessons ),
				'lessons'       => $lessons,
				'image'         => ! empty( $level['image_desktop_id'] ) ? wp_get_attachment_image_url( (int) $level['image_desktop_id'], 'full' ) : null,
				'landing_background' => ! empty( $level['landing_background_id'] ) ? wp_get_attachment_image_url( (int) $level['landing_background_id'], 'full' ) : null,
				'title_image'   => ! empty( $level['title_image_id'] ) ? wp_get_attachment_image_url( (int) $level['title_image_id'], 'full' ) : null,
				'thumbnail'     => ! empty( $level['thumbnail_desktop_id'] ) ? wp_get_attachment_image_url( (int) $level['thumbnail_desktop_id'], 'large' ) : null,
				'overview_link' => ! empty( $level['overview_link'] ) ? $level['overview_link'] : null,
				'trailer_link'  => ! empty( $level['trailer_link'] ) ? $level['trailer_link'] : null,
				'instructor'    => self::format_person( (int) ( $level['instructor_id'] ?? 0 ) ),
				'guest'         => self::format_person( (int) ( $level['guest_id'] ?? 0 ) ),
			);
		}
		return $formatted;
	}

	private static function format_course_seasons( $course_id, $stored = null ) {
		$stored = is_array( $stored ) ? $stored : TCNexus_Course_Builder::get_course_seasons( $course_id );
		return self::format_course_levels( $course_id, $stored );
	}

	private static function format_course_languages( $course_id ) {
		$stored = TCNexus_Course_Builder::get_course_languages( $course_id );
		$formatted = array();
		$is_show = 'tc_show' === get_post_type( $course_id );
		foreach ( $stored as $language_slug => $language ) {
			$formatted[ $language_slug ] = array(
				'label'  => $language['label'],
				'levels' => self::format_course_levels( $course_id, $language['levels'] ),
			);
			if ( $is_show ) {
				$formatted[ $language_slug ]['seasons'] = self::format_course_seasons( $course_id, $language['levels'] );
			}
		}
		return $formatted;
	}

	private static function course_type_names( $slugs ) {
		$terms = get_terms( array( 'taxonomy' => 'course_type', 'slug' => array_values( array_filter( $slugs ) ), 'hide_empty' => false ) );
		return is_wp_error( $terms ) ? array() : wp_list_pluck( $terms, 'name' );
	}

	/** Format a reusable person or character profile for the public catalog. */
	private static function format_person( $person_id ) {
		if ( ! $person_id ) {
			return null;
		}
		$person = get_post( $person_id );
		if ( ! $person || ! in_array( $person->post_type, array( 'tc_instructor', 'tc_character' ), true ) ) {
			return null;
		}
		return array(
			'id'    => $person->ID,
			'name'  => $person->post_title,
			'photo' => get_the_post_thumbnail_url( $person->ID, 'medium' ) ?: TCNexus_Profile_Placeholders::get_saved_url( $person->ID ),
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

	private static function format_characters( $course_id ) {
		$character_ids = (array) get_post_meta( $course_id, TCNexus_Course_Builder::SHOW_CHARACTERS_META_KEY, true );
		$characters = array();
		foreach ( $character_ids as $character_id ) {
			$character = self::format_person( absint( $character_id ) );
			if ( $character ) {
				$characters[] = $character;
			}
		}
		return $characters;
	}

	public static function session_status( \WP_REST_Request $request ) {
		$user_id = self::get_user_id( $request );
		return new WP_REST_Response( array(
			'viewer_tier' => TCNexus_Membership::get_user_tier( $user_id ),
		), 200 );
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
		$settings = TCNexus_Registration_Settings::get_public_settings();
		$settings['pricing'] = TCNexus_Registration_Settings::get_paid_membership_settings();
		$settings['animations'] = array(
			'card_carousel' => TCNexus_Animations_Settings::get_active_preset(),
		);
		return new WP_REST_Response( $settings, 200 );
	}

	private static function count_course_lessons( $course_id, $level = '' ) {
		$meta_query = array(
			array( 'key' => '_tcnexus_course_id', 'value' => $course_id ),
		);
		if ( $level ) {
			$meta_query[] = 'beginner' === $level
				? array(
					'relation' => 'OR',
					array( 'key' => '_tcnexus_course_level', 'value' => $level ),
					array( 'key' => '_tcnexus_course_level', 'compare' => 'NOT EXISTS' ),
				)
				: array( 'key' => '_tcnexus_course_level', 'value' => $level );
		}
		$query = new WP_Query( array(
			'post_type'      => 'tc_lesson',
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'meta_query'     => $meta_query,
		) );
		return (int) $query->found_posts;
	}

	private static function get_course_lessons( $course_id, $level = '' ) {
		$meta_query = array(
			array( 'key' => '_tcnexus_course_id', 'value' => $course_id ),
		);
		if ( $level ) {
			$meta_query[] = 'beginner' === $level
				? array(
					'relation' => 'OR',
					array( 'key' => '_tcnexus_course_level', 'value' => $level ),
					array( 'key' => '_tcnexus_course_level', 'compare' => 'NOT EXISTS' ),
				)
				: array( 'key' => '_tcnexus_course_level', 'value' => $level );
		}
		$lessons = get_posts( array(
			'post_type'      => 'tc_lesson',
			'posts_per_page' => -1,
			'meta_query'     => $meta_query,
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
			'guests'     => array_values( array_filter( array_map( function ( $person_id ) {
				return self::format_person( $person_id );
			}, TCNexus_Course_Builder::get_lesson_guest_ids( $lesson->ID ) ) ) ),
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
