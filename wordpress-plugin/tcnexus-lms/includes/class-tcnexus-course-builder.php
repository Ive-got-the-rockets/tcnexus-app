<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * A single admin page for building a course: everything about it — basics,
 * media, people, links, and its full lesson list — in one tabbed form,
 * instead of the native flow of editing a course post and then separately
 * creating and linking each lesson post one at a time.
 */
class TCNexus_Course_Builder {

	const PAGE_SLUG = 'tcnexus-course-builder';
	const SHOW_PAGE_SLUG = 'tcnexus-show-builder';
	const SHOW_POST_TYPE = 'tc_show';
	const SHOW_CATEGORY = 'shows';
	const SHOW_CHARACTERS_META_KEY = '_tcnexus_show_characters';

	const LEVELS = array(
		'beginner'     => 'Beginner',
		'intermediate' => 'Intermediate',
		'advanced'     => 'Advanced',
	);

	const LANGUAGES = array(
		'en' => 'English',
		'es' => 'Spanish',
		'pt' => 'Portuguese',
		'fr' => 'French',
		'de' => 'German',
		'other' => 'Other',
	);

	const LANGUAGE_CODES = array(
		'en'    => 'eng',
		'es'    => 'spa',
		'pt'    => 'por',
		'fr'    => 'fra',
		'de'    => 'deu',
		'other' => 'oth',
	);

	const LEVEL_META_KEY = '_tcnexus_course_levels';
	const LANGUAGE_META_KEY = '_tcnexus_course_languages';
	const LEVEL_LESSON_META_KEY = '_tcnexus_course_level';
	const LANGUAGE_LESSON_META_KEY = '_tcnexus_course_language';
	const LESSON_GUESTS_META_KEY = '_tcnexus_lesson_guest_ids';
	const LESSON_CHARACTERS_META_KEY = '_tcnexus_lesson_character_ids';
	const LESSON_TC_LENS_MESSAGE_META_KEY = '_tcnexus_tc_lens_message';
	const LESSON_TC_LENS_TIMELINE_META_KEY = '_tcnexus_tc_lens_timeline';
	const LEVEL_MIGRATION_OPTION = '_tcnexus_course_levels_migrated_1';
	const SHOW_SEASON_MIGRATION_OPTION = '_tcnexus_show_seasons_migrated_1';

	private static $hook_suffix;
	private static $show_hook_suffix;

	private static function is_show_mode() {
		return self::SHOW_PAGE_SLUG === ( $_GET['page'] ?? '' )
			|| 'show' === ( $_GET['builder_mode'] ?? '' )
			|| 'show' === ( $_POST['builder_mode'] ?? '' );
	}

	private static function content_type() {
		return self::is_show_mode() ? self::SHOW_POST_TYPE : 'tc_course';
	}

	private static function content_label( $plural = false ) {
		return self::is_show_mode() ? ( $plural ? 'Shows' : 'Show' ) : ( $plural ? 'Courses' : 'Course' );
	}

	private static function builder_page() {
		return self::is_show_mode() ? self::SHOW_PAGE_SLUG : self::PAGE_SLUG;
	}

	public static function level_label( $slug ) {
		if ( preg_match( '/^season-(\d+)$/', (string) $slug, $matches ) ) {
			return 'Season ' . absint( $matches[1] );
		}
		return isset( self::LEVELS[ $slug ] ) ? self::LEVELS[ $slug ] : ucfirst( (string) $slug );
	}

	public static function language_code( $slug ) {
		return self::LANGUAGE_CODES[ $slug ] ?? 'oth';
	}

	private static function slug_base( $slug ) {
		$slug = sanitize_title( $slug );
		$slug = preg_replace( '/^(?:eng|spa|por|fra|deu|oth)-/', '', $slug );
		$slug = preg_replace( '/-(?:beginner|intermediate|advanced)$/', '', $slug );
		return trim( (string) $slug, '-' );
	}

	private static function level_slug( $language, $base_slug, $level ) {
		$base_slug = self::slug_base( $base_slug );
		if ( '' === $base_slug ) {
			return '';
		}
		return sanitize_title( self::language_code( $language ) . '-' . $base_slug . '-' . $level );
	}

	private static function empty_level( $slug ) {
		return array(
			'enabled'              => false,
			'slug'                 => $slug,
			'label'                => self::level_label( $slug ),
			'title'                => '',
			'course_slug'          => '',
			'content'              => '',
			'course_types'         => array(),
			'language'             => 'en',
			'image_desktop_id'     => 0,
			'image_mobile_id'      => 0,
			'landing_background_id' => 0,
			'title_image_id'      => 0,
			'thumbnail_desktop_id' => 0,
			'thumbnail_mobile_id'  => 0,
			'instructor_id'        => 0,
			'instructor_ids'       => array(),
			'guest_id'             => 0,
			'character_ids'        => array(),
			'overview_link'        => '',
			'trailer_link'         => '',
		);
	}

	private static function legacy_level( $course_id ) {
		$types = wp_get_post_terms( $course_id, 'course_type', array( 'fields' => 'slugs' ) );
		$course = get_post( $course_id );
		$level = self::empty_level( 'beginner' );
		$level['enabled']              = true;
		$level['title']                = $course ? $course->post_title : '';
		$level['course_slug']          = $course ? $course->post_name : '';
		$level['content']              = $course ? $course->post_content : '';
		$level['course_types']         = is_wp_error( $types ) ? array() : array_values( $types );
		$level['language']             = get_post_meta( $course_id, '_tcnexus_course_language', true ) ?: 'en';
		$level['image_desktop_id']     = (int) get_post_meta( $course_id, '_tcnexus_image_desktop_id', true );
		$level['image_mobile_id']      = (int) get_post_meta( $course_id, '_tcnexus_image_mobile_id', true );
		$level['landing_background_id'] = (int) get_post_meta( $course_id, '_tcnexus_landing_background_id', true );
		$level['title_image_id']      = (int) get_post_meta( $course_id, '_tcnexus_title_image_id', true );
		$level['thumbnail_desktop_id'] = (int) get_post_thumbnail_id( $course_id );
		$level['thumbnail_mobile_id']  = (int) get_post_meta( $course_id, '_tcnexus_thumbnail_mobile_id', true );
		$level['instructor_id']        = (int) get_post_meta( $course_id, '_tcnexus_instructor_id', true );
		$level['instructor_ids']       = array_values( array_filter( array_map( 'absint', (array) get_post_meta( $course_id, '_tcnexus_instructor_ids', true ) ) ) );
		if ( empty( $level['instructor_ids'] ) && $level['instructor_id'] ) { $level['instructor_ids'] = array( $level['instructor_id'] ); }
		$level['guest_id']             = (int) get_post_meta( $course_id, '_tcnexus_guest_id', true );
		$level['character_ids']        = array_values( array_filter( array_map( 'absint', (array) get_post_meta( $course_id, self::SHOW_CHARACTERS_META_KEY, true ) ) ) );
		$level['overview_link']        = get_post_meta( $course_id, '_tcnexus_overview_link', true );
		$level['trailer_link']         = get_post_meta( $course_id, '_tcnexus_trailer_link', true );
		return $level;
	}

	private static function get_legacy_course_levels( $course_id ) {
		$stored = get_post_meta( $course_id, self::LEVEL_META_KEY, true );
		if ( ! is_array( $stored ) || empty( $stored ) ) {
			$stored = array( 'beginner' => self::legacy_level( $course_id ) );
		}

		$levels = array();
		foreach ( self::LEVELS as $slug => $label ) {
			$level = self::empty_level( $slug );
			if ( isset( $stored[ $slug ] ) && is_array( $stored[ $slug ] ) ) {
				$level = array_merge( $level, $stored[ $slug ] );
			}
			if ( empty( $level['instructor_ids'] ) && ! empty( $level['instructor_id'] ) ) {
				$level['instructor_ids'] = array( absint( $level['instructor_id'] ) );
			}
			if ( 'beginner' === $slug && empty( $level['course_slug'] ) ) {
				$level['course_slug'] = get_post_field( 'post_name', $course_id );
			}
			$level['slug']  = $slug;
			$level['label'] = $label;
			$levels[ $slug ] = $level;
		}

		return $levels;
	}

	public static function get_course_languages( $course_id ) {
		$is_show = self::SHOW_POST_TYPE === get_post_type( $course_id );
		$stored = get_post_meta( $course_id, self::LANGUAGE_META_KEY, true );
		if ( is_array( $stored ) && ! empty( $stored ) ) {
			$languages = array();
			foreach ( $stored as $language_slug => $language_data ) {
				$language_slug = sanitize_key( $language_slug );
				if ( ! array_key_exists( $language_slug, self::LANGUAGES ) || ! is_array( $language_data ) ) {
					continue;
				}
				$levels = isset( $language_data['levels'] ) && is_array( $language_data['levels'] ) ? $language_data['levels'] : array();
				if ( $is_show ) {
					$levels = self::normalize_show_seasons( $levels );
					$languages[ $language_slug ] = array(
						'label'  => self::LANGUAGES[ $language_slug ],
						'levels' => $levels,
					);
					continue;
				}
				$normalised = array();
				foreach ( self::LEVELS as $level_slug => $level_label ) {
					$level = self::empty_level( $level_slug );
					if ( isset( $levels[ $level_slug ] ) && is_array( $levels[ $level_slug ] ) ) {
						$level = array_merge( $level, $levels[ $level_slug ] );
					}
					$level['slug']  = $level_slug;
					$level['label'] = $level_label;
					$normalised[ $level_slug ] = $level;
				}
				$languages[ $language_slug ] = array(
					'label'  => self::LANGUAGES[ $language_slug ],
					'levels' => $normalised,
				);
			}
			if ( ! empty( $languages ) ) {
				return $languages;
			}
		}

		$legacy_levels = self::get_legacy_course_levels( $course_id );
		if ( $is_show ) {
			$legacy_levels = self::normalize_show_seasons( $legacy_levels );
		}
		return array(
			'en' => array(
				'label'  => self::LANGUAGES['en'],
				'levels' => $legacy_levels,
			),
		);
	}

	/** Convert a legacy show-level map to stable, sequential season keys. */
	private static function normalize_show_seasons( $stored ) {
		$stored = is_array( $stored ) ? $stored : array();
		$seasons = array();
		$legacy_base_title = (string) ( $stored['beginner']['title'] ?? '' );
		foreach ( $stored as $slug => $data ) {
			if ( ! is_array( $data ) ) {
				continue;
			}
			if ( preg_match( '/^season-(\d+)$/', (string) $slug, $matches ) ) {
				$season_number = max( 1, absint( $matches[1] ) );
			} elseif ( isset( self::LEVELS[ $slug ] ) ) {
				$season_number = array_search( $slug, array_keys( self::LEVELS ), true ) + 1;
				if ( 'beginner' !== $slug && ! self::legacy_show_level_has_data( $data, $slug, $legacy_base_title ) ) {
					continue;
				}
			} else {
				continue;
			}
			$season_slug = 'season-' . $season_number;
			$season = array_merge( self::empty_level( $season_slug ), $data );
			$season['slug'] = $season_slug;
			$season['label'] = self::level_label( $season_slug );
			$season['enabled'] = true;
			$seasons[ $season_slug ] = $season;
		}
		if ( empty( $seasons ) ) {
			$seasons['season-1'] = self::empty_level( 'season-1' );
			$seasons['season-1']['enabled'] = true;
		}
		uksort( $seasons, function ( $left, $right ) {
			return absint( substr( $left, 7 ) ) <=> absint( substr( $right, 7 ) );
		} );
		return $seasons;
	}

	private static function legacy_show_level_has_data( $level, $slug, $base_title ) {
		if ( ! empty( $level['enabled'] ) ) {
			return true;
		}
		if ( ! empty( $level['title'] ) ) {
			$generated_title = $base_title . ' - ' . ( self::LEVELS[ $slug ] ?? '' );
			if ( ! $base_title || 0 !== strcasecmp( trim( (string) $level['title'] ), $generated_title ) ) {
				return true;
			}
		}
		foreach ( array( 'content', 'overview_link', 'trailer_link' ) as $key ) {
			if ( ! empty( $level[ $key ] ) ) {
				return true;
			}
		}
		foreach ( array( 'image_desktop_id', 'image_mobile_id', 'landing_background_id', 'title_image_id', 'thumbnail_desktop_id', 'thumbnail_mobile_id', 'instructor_id', 'guest_id' ) as $key ) {
			if ( ! empty( $level[ $key ] ) ) {
				return true;
			}
		}
		$course_types = array_diff( (array) ( $level['course_types'] ?? array() ), array( self::SHOW_CATEGORY ) );
		return ! empty( $course_types ) || ! empty( $level['character_ids'] );
	}

	public static function get_course_seasons( $course_id, $language = '' ) {
		$languages = self::get_course_languages( $course_id );
		$language = $language && isset( $languages[ $language ] ) ? $language : ( isset( $languages['en'] ) ? 'en' : ( array_key_first( $languages ) ?: 'en' ) );
		return $languages[ $language ]['levels'] ?? self::normalize_show_seasons( array() );
	}

	public static function get_course_levels( $course_id ) {
		$languages = self::get_course_languages( $course_id );
		if ( isset( $languages['en']['levels'] ) ) {
			return $languages['en']['levels'];
		}
		$language_keys = array_keys( $languages );
		$primary_language = $language_keys[0] ?? '';
		return $primary_language && isset( $languages[ $primary_language ]['levels'] ) ? $languages[ $primary_language ]['levels'] : self::get_legacy_course_levels( $course_id );
	}

	public static function sanitize_course_levels( $raw_levels ) {
		$levels = array();
		$raw_levels = is_array( $raw_levels ) ? $raw_levels : array();
		$level_keys = self::is_show_mode() ? array_fill_keys( array_keys( self::normalize_show_seasons( $raw_levels ) ), '' ) : self::LEVELS;
		foreach ( $level_keys as $slug => $label ) {
			$raw = isset( $raw_levels[ $slug ] ) && is_array( $raw_levels[ $slug ] ) ? $raw_levels[ $slug ] : array();
			$level = self::empty_level( $slug );
			$level['enabled'] = self::is_show_mode() ? true : ! empty( $raw['enabled'] );
			$level['title'] = sanitize_text_field( wp_unslash( $raw['title'] ?? '' ) );
			$level['course_slug'] = sanitize_title( wp_unslash( $raw['course_slug'] ?? '' ) );
			$level['content'] = wp_kses_post( wp_unslash( $raw['content'] ?? '' ) );
			$level['course_types'] = array_values( array_filter( array_map( 'sanitize_key', (array) ( $raw['course_types'] ?? array() ) ) ) );
			$level['language'] = array_key_exists( sanitize_key( $raw['language'] ?? 'en' ), self::LANGUAGES ) ? sanitize_key( $raw['language'] ?? 'en' ) : 'en';
			foreach ( array( 'image_desktop_id', 'image_mobile_id', 'landing_background_id', 'title_image_id', 'thumbnail_desktop_id', 'thumbnail_mobile_id', 'instructor_id', 'guest_id' ) as $key ) {
				$level[ $key ] = absint( $raw[ $key ] ?? 0 );
			}
			$instructor_ids = isset( $raw['instructor_ids'] ) ? (array) $raw['instructor_ids'] : ( $level['instructor_id'] ? array( $level['instructor_id'] ) : array() );
			$level['instructor_ids'] = array_values( array_unique( array_filter( array_map( 'absint', $instructor_ids ) ) ) );
			$level['instructor_id'] = $level['instructor_ids'][0] ?? 0;
			$level['character_ids'] = array_values( array_filter( array_map( 'absint', (array) ( $raw['character_ids'] ?? array() ) ) ) );
			$level['overview_link'] = esc_url_raw( wp_unslash( $raw['overview_link'] ?? '' ) );
			$level['trailer_link'] = esc_url_raw( wp_unslash( $raw['trailer_link'] ?? '' ) );
			$levels[ $slug ] = $level;
		}
		return $levels;
	}

	public static function maybe_migrate_show_seasons() {
		if ( get_option( self::SHOW_SEASON_MIGRATION_OPTION ) ) {
			return;
		}
		$shows = get_posts( array( 'post_type' => self::SHOW_POST_TYPE, 'posts_per_page' => -1, 'post_status' => array( 'publish', 'draft' ), 'fields' => 'ids' ) );
		foreach ( $shows as $show_id ) {
			$languages = get_post_meta( $show_id, self::LANGUAGE_META_KEY, true );
			if ( ! is_array( $languages ) || empty( $languages ) ) {
				$languages = array( 'en' => array( 'label' => self::LANGUAGES['en'], 'levels' => self::get_legacy_course_levels( $show_id ) ) );
			}
			foreach ( $languages as $language_slug => &$language_data ) {
				$legacy = isset( $language_data['levels'] ) && is_array( $language_data['levels'] ) ? $language_data['levels'] : array();
				$language_data['levels'] = self::normalize_show_seasons( $legacy );
			}
			unset( $language_data );
			update_post_meta( $show_id, self::LANGUAGE_META_KEY, $languages );
			$primary_language = isset( $languages['en'] ) ? 'en' : array_key_first( $languages );
			if ( $primary_language && isset( $languages[ $primary_language ]['levels'] ) ) {
				update_post_meta( $show_id, self::LEVEL_META_KEY, $languages[ $primary_language ]['levels'] );
			}
			$episodes = get_posts( array( 'post_type' => 'tc_lesson', 'posts_per_page' => -1, 'post_status' => array( 'publish', 'draft' ), 'fields' => 'ids', 'meta_key' => '_tcnexus_course_id', 'meta_value' => $show_id ) );
			foreach ( $episodes as $episode_id ) {
				$legacy_level = get_post_meta( $episode_id, self::LEVEL_LESSON_META_KEY, true ) ?: 'beginner';
				if ( array_key_exists( $legacy_level, self::LEVELS ) ) {
					$season_number = array_search( $legacy_level, array_keys( self::LEVELS ), true ) + 1;
					$season_slug = 'season-' . $season_number;
					$episode_language = get_post_meta( $episode_id, self::LANGUAGE_LESSON_META_KEY, true ) ?: 'en';
					if ( isset( $languages[ $episode_language ]['levels'] ) && ! isset( $languages[ $episode_language ]['levels'][ $season_slug ] ) ) {
						$languages[ $episode_language ]['levels'][ $season_slug ] = self::empty_level( $season_slug );
						$languages[ $episode_language ]['levels'][ $season_slug ]['enabled'] = true;
					}
					update_post_meta( $episode_id, self::LEVEL_LESSON_META_KEY, $season_slug );
				}
			}
			update_post_meta( $show_id, self::LANGUAGE_META_KEY, $languages );
			$primary_language = isset( $languages['en'] ) ? 'en' : array_key_first( $languages );
			if ( $primary_language && isset( $languages[ $primary_language ]['levels'] ) ) {
				update_post_meta( $show_id, self::LEVEL_META_KEY, $languages[ $primary_language ]['levels'] );
			}
		}
		update_option( self::SHOW_SEASON_MIGRATION_OPTION, 1, false );
	}

	public static function maybe_migrate_course_levels() {
		if ( get_option( self::LEVEL_MIGRATION_OPTION ) ) {
			return;
		}
		$courses = get_posts( array( 'post_type' => 'tc_course', 'posts_per_page' => -1, 'post_status' => array( 'publish', 'draft' ), 'fields' => 'ids' ) );
		foreach ( $courses as $course_id ) {
			if ( ! get_post_meta( $course_id, self::LEVEL_META_KEY, true ) ) {
				update_post_meta( $course_id, self::LEVEL_META_KEY, array( 'beginner' => self::legacy_level( $course_id ) ) );
			}
			$lessons = get_posts( array( 'post_type' => 'tc_lesson', 'posts_per_page' => -1, 'fields' => 'ids', 'post_status' => array( 'publish', 'draft' ), 'meta_key' => '_tcnexus_course_id', 'meta_value' => $course_id ) );
			foreach ( $lessons as $lesson_id ) {
				if ( ! get_post_meta( $lesson_id, self::LEVEL_LESSON_META_KEY, true ) ) {
					update_post_meta( $lesson_id, self::LEVEL_LESSON_META_KEY, 'beginner' );
				}
			}
		}
		update_option( self::LEVEL_MIGRATION_OPTION, 1, false );
	}

	public static function register() {
		// Registered with a null parent so it's a real, addressable admin
		// page (WordPress tracks it, capability-checks it, fires load-{hook}
		// for it) without appearing under any menu — adding it under
		// edit.php?post_type=tc_course and then remove_submenu_page()-ing it
		// looks equivalent but isn't: WordPress resolves a page's "parent" by
		// searching that same submenu list at request time, so a removed
		// entry resolves to a different parent than it was registered with
		// and access gets denied ("Sorry, you are not allowed to access this
		// page.") even for a user who can otherwise edit courses fine.
		self::$hook_suffix = add_submenu_page(
			null,
			'Course Builder',
			'Course Builder',
			'edit_posts',
			self::PAGE_SLUG,
			array( __CLASS__, 'render' )
		);

		// Reached through WordPress's own "All Courses" / "Add New Course"
		// menu items (redirected below) instead of a separate menu entry.

		// `load-{hook}` fires before any admin HTML is output, unlike the
		// page callback itself — redirects here are safe; a redirect from
		// inside render() breaks with "headers already sent" because
		// admin.php has already printed the page chrome by the time it
		// calls the page callback.
		add_action( 'load-' . self::$hook_suffix, array( __CLASS__, 'maybe_create_course' ) );
		add_action( 'load-' . self::$hook_suffix, array( __CLASS__, 'set_page_title' ) );
		self::$show_hook_suffix = add_menu_page( 'Shows', 'Shows', 'edit_posts', self::SHOW_PAGE_SLUG, array( __CLASS__, 'render' ), 'dashicons-format-video', 27 );
		add_action( 'load-' . self::$show_hook_suffix, array( __CLASS__, 'maybe_create_show' ) );
		add_action( 'load-' . self::$show_hook_suffix, array( __CLASS__, 'set_page_title' ) );
		add_action( 'load-edit.php', array( __CLASS__, 'redirect_course_list' ) );
		add_action( 'load-post-new.php', array( __CLASS__, 'redirect_course_new' ) );
		add_action( 'load-post.php', array( __CLASS__, 'redirect_course_edit' ) );
	}

	/**
	 * WordPress derives the admin page title (used in admin-header.php,
	 * including a `strip_tags( $title )` call) by searching the same
	 * $submenu structure get_admin_page_parent() uses — which our
	 * intentionally-parentless page isn't part of, so it's left null and
	 * trips a "Passing null to strip_tags()" deprecation notice. Setting it
	 * directly, before admin-header.php runs, sidesteps that lookup entirely.
	 */
	public static function set_page_title() {
		global $title;
		$title = self::is_show_mode() ? 'Shows' : 'Course Builder';
	}

	public static function maybe_create_show() {
		if ( ! isset( $_GET['new'] ) || '1' !== $_GET['new'] || ! empty( $_GET['course_id'] ) ) {
			return;
		}
		$new_id = wp_insert_post( array( 'post_type' => self::SHOW_POST_TYPE, 'post_title' => 'Untitled Show', 'post_status' => 'draft' ) );
		if ( is_wp_error( $new_id ) ) {
			return;
		}
		wp_set_post_terms( $new_id, array( self::SHOW_CATEGORY ), 'course_type', false );
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::SHOW_PAGE_SLUG . '&course_id=' . $new_id . '&new=1' ) );
		exit;
	}

	public static function maybe_create_course() {
		// Keep `new=1` on the editor URL so the client can identify a newly
		// created course, but only create the draft on the initial request.
		if ( ! isset( $_GET['new'] ) || '1' !== $_GET['new'] || ! empty( $_GET['course_id'] ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( 'You do not have permission to access this page.' );
		}

		$new_id = wp_insert_post( array(
			'post_type'   => 'tc_course',
			'post_title'  => 'Untitled Course',
			'post_status' => 'draft',
		) );
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&course_id=' . $new_id . '&new=1' ) );
		exit;
	}

	public static function redirect_course_list() {
		if ( isset( $_GET['post_type'] ) && 'tc_course' === $_GET['post_type'] ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG ) );
			exit;
		}
	}

	public static function redirect_course_new() {
		if ( isset( $_GET['post_type'] ) && 'tc_course' === $_GET['post_type'] ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&new=1' ) );
			exit;
		}
	}

	public static function redirect_course_edit() {
		$action = isset( $_GET['action'] ) ? $_GET['action'] : 'edit';
		if ( 'edit' !== $action || empty( $_GET['post'] ) ) {
			return;
		}

		$post_id = absint( $_GET['post'] );
		if ( 'tc_course' === get_post_type( $post_id ) ) {
			wp_safe_redirect( admin_url( 'admin.php?page=' . self::PAGE_SLUG . '&course_id=' . $post_id ) );
			exit;
		}
	}

	public static function enqueue_assets( $hook ) {
		if ( $hook !== self::$hook_suffix && $hook !== self::$show_hook_suffix ) {
			return;
		}

		wp_enqueue_media();

		wp_enqueue_style(
			'tcnexus-builder-fonts',
			'https://fonts.googleapis.com/css2?family=Fraunces:wght@300;400;500;600;700;900&family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap',
			array(),
			null
		);

		wp_enqueue_style(
			'tcnexus-course-builder',
			TCNEXUS_LMS_URL . 'assets/course-builder.css',
			array(),
			TCNEXUS_LMS_VERSION
		);

		wp_enqueue_script(
			'tcnexus-crop-rect',
			TCNEXUS_LMS_URL . 'assets/crop-rect.js',
			array(),
			TCNEXUS_LMS_VERSION,
			true
		);
		wp_enqueue_script(
			'tcnexus-navigation-guard',
			TCNEXUS_LMS_URL . 'assets/navigation-guard.js',
			array(),
			TCNEXUS_LMS_VERSION,
			true
		);
		wp_enqueue_script(
			'tcnexus-course-builder',
			TCNEXUS_LMS_URL . 'assets/course-builder.js',
			array( 'tcnexus-crop-rect', 'tcnexus-navigation-guard' ),
			TCNEXUS_LMS_VERSION,
			true
		);

		TCNexus_Media::localize( 'tcnexus-course-builder' );
	}

	public static function render() {
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_die( 'You do not have permission to access this page.' );
		}

		$course_id = isset( $_GET['course_id'] ) ? absint( $_GET['course_id'] ) : 0;

		if ( $course_id ) {
			self::render_form( $course_id );
		} else {
			self::render_list();
		}
	}

	private static function render_list() {
		$courses = get_posts( array(
			'post_type'      => self::content_type(),
			'posts_per_page' => -1,
			'post_status'    => array( 'publish', 'draft' ),
			'orderby'        => 'title',
			'order'          => 'ASC',
		) );
		?>
		<div class="wrap tcn-list-wrap">
			<div class="tcn-list-header">
		<h1><?php echo esc_html( self::content_label( true ) ); ?></h1>
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::builder_page() . '&new=1' ) ); ?>" class="tcn-add-course-btn">+ Add New <?php echo esc_html( self::content_label() ); ?></a>
			</div>

			<?php if ( isset( $_GET['deleted'] ) ) : ?>
				<div class="tcn-notice tcn-notice--success" style="margin-bottom:18px;"><?php echo esc_html( self::content_label() ); ?> moved to trash.</div>
			<?php endif; ?>

			<?php if ( empty( $courses ) ) : ?>
				<p>No <?php echo esc_html( strtolower( self::content_label( true ) ) ); ?> yet.</p>
			<?php else : ?>
				<div class="tcn-course-view-switcher" role="group" aria-label="<?php echo esc_attr( self::content_label() ); ?> list view">
					<button type="button" class="tcn-course-view-switcher__button" data-course-view="compact">Compact</button>
					<button type="button" class="tcn-course-view-switcher__button is-active" data-course-view="detail">Detail</button>
					<button type="button" class="tcn-course-view-switcher__button" data-course-view="card">Cards</button>
				</div>

				<div class="tcn-course-view tcn-course-view--compact" data-course-view-panel="compact" hidden>
					<div class="tcn-course-table-wrap">
						<table class="tcn-course-table tcn-course-table--compact">
							<thead><tr><th><?php echo esc_html( self::content_label() ); ?></th><th>Type</th><th>Languages</th><th>Levels</th><th>Status</th><th>Actions</th></tr></thead>
							<tbody>
							<?php foreach ( $courses as $course ) :
								$types = wp_get_post_terms( $course->ID, 'course_type', array( 'fields' => 'names' ) );
								$languages = self::get_course_languages( $course->ID );
								$level_slugs = array();
								foreach ( $languages as $language_data ) {
									foreach ( (array) $language_data['levels'] as $level_slug => $level ) {
										if ( ! empty( $level['enabled'] ) ) { $level_slugs[ $level_slug ] = true; }
									}
								}
								$edit_url = admin_url( 'admin.php?page=' . self::builder_page() . '&course_id=' . $course->ID );
								$delete_url = wp_nonce_url( admin_url( 'admin-post.php?action=' . ( self::is_show_mode() ? 'tcnexus_delete_show' : 'tcnexus_delete_course' ) . '&course_id=' . $course->ID . '&builder_mode=' . ( self::is_show_mode() ? 'show' : 'course' ) ), 'tcnexus_delete_course_' . $course->ID );
							?>
							<tr>
								<td class="tcn-course-table__title"><?php echo esc_html( $course->post_title ?: 'Untitled ' . self::content_label() ); ?></td>
								<td><?php foreach ( is_wp_error( $types ) ? array() : $types as $type ) : ?><span class="tcn-course-table__badge"><?php echo esc_html( $type ); ?></span><?php endforeach; ?></td>
								<td><span class="tcn-course-table__badge"><?php echo count( $languages ); ?> languages</span></td>
								<td><span class="tcn-course-table__badge"><?php echo count( $level_slugs ); ?> levels</span></td>
								<td><span class="tcn-course-table__status tcn-course-table__status--<?php echo esc_attr( $course->post_status ); ?>"><span aria-hidden="true">●</span> <?php echo esc_html( ucfirst( $course->post_status ) ); ?></span></td>
								<td><?php self::render_list_actions( $edit_url, $delete_url, $course ); ?></td>
							</tr>
							<?php endforeach; ?>
							</tbody>
						</table>
					</div>
				</div>

				<div class="tcn-course-view tcn-course-view--detail" data-course-view-panel="detail">
					<div class="tcn-course-table-wrap">
						<table class="tcn-course-table tcn-course-table--detail">
							<thead><tr><th><?php echo esc_html( self::content_label() ); ?></th><th>Type</th><th>Language &amp; Level Breakdown</th><th>Status</th><th>Actions</th></tr></thead>
							<tbody>
							<?php foreach ( $courses as $course ) :
								$types = wp_get_post_terms( $course->ID, 'course_type', array( 'fields' => 'names' ) );
								$languages = self::get_course_languages( $course->ID );
								$primary_language = reset( $languages );
								$primary_levels = is_array( $primary_language ) && isset( $primary_language['levels'] ) ? $primary_language['levels'] : array();
								$card_image_id = (int) get_post_thumbnail_id( $course->ID );
								if ( ! $card_image_id && ! empty( $primary_levels['beginner']['thumbnail_desktop_id'] ) ) { $card_image_id = absint( $primary_levels['beginner']['thumbnail_desktop_id'] ); }
								if ( ! $card_image_id && ! empty( $primary_levels['beginner']['image_desktop_id'] ) ) { $card_image_id = absint( $primary_levels['beginner']['image_desktop_id'] ); }
								$card_image_url = $card_image_id ? wp_get_attachment_image_url( $card_image_id, 'medium' ) : '';
								$instructor_ids = (array) ( $primary_levels['beginner']['instructor_ids'] ?? array() );
								if ( empty( $instructor_ids ) && ! empty( $primary_levels['beginner']['instructor_id'] ) ) { $instructor_ids = array( $primary_levels['beginner']['instructor_id'] ); }
								$instructors = array_values( array_filter( array_map( 'get_post', array_map( 'absint', $instructor_ids ) ) ) );
								$characters = self::is_show_mode() ? array_values( array_filter( array_map( 'get_post', array_map( 'absint', (array) get_post_meta( $course->ID, self::SHOW_CHARACTERS_META_KEY, true ) ) ) ) ) : array();
								$edit_url = admin_url( 'admin.php?page=' . self::builder_page() . '&course_id=' . $course->ID );
								$delete_url = wp_nonce_url( admin_url( 'admin-post.php?action=' . ( self::is_show_mode() ? 'tcnexus_delete_show' : 'tcnexus_delete_course' ) . '&course_id=' . $course->ID . '&builder_mode=' . ( self::is_show_mode() ? 'show' : 'course' ) ), 'tcnexus_delete_course_' . $course->ID );
							?>
							<tr>
								<td><div class="tcn-course-table__course"><span class="tcn-course-table__image"><?php if ( $card_image_url ) : ?><img src="<?php echo esc_url( $card_image_url ); ?>" alt="" loading="lazy" /><?php else : ?><span><?php echo esc_html( self::content_label() ); ?> image</span><?php endif; ?></span><div><strong><?php echo esc_html( $course->post_title ?: 'Untitled ' . self::content_label() ); ?></strong><div class="tcn-course-table__people"><?php if ( self::is_show_mode() ) : ?><span><b>Characters:</b> <?php echo esc_html( $characters ? implode( ', ', wp_list_pluck( $characters, 'post_title' ) ) : '—' ); ?></span><?php else : ?><span><b>Instructor:</b> <?php echo esc_html( $instructor ? $instructor->post_title : '—' ); ?></span><span><b>Guest:</b> <?php echo esc_html( $guest ? $guest->post_title : '—' ); ?></span><?php endif; ?></div></div></div></td>
								<td><?php foreach ( is_wp_error( $types ) ? array() : $types as $type ) : ?><span class="tcn-course-table__badge"><?php echo esc_html( $type ); ?></span><?php endforeach; ?></td>
								<td><div class="tcn-course-table__breakdown"><?php foreach ( $languages as $language_slug => $language_data ) : ?><div class="tcn-course-table__language"><strong><?php echo esc_html( $language_data['label'] ); ?></strong><div><?php foreach ( (array) $language_data['levels'] as $level_slug => $level ) : ?><?php if ( empty( $level['enabled'] ) ) { continue; } ?><span class="tcn-course-table__level"><span><?php echo esc_html( $level['label'] ); ?></span><em><?php echo (int) self::count_language_level_lessons( $course->ID, $language_slug, $level_slug ); ?> <?php echo esc_html( self::is_show_mode() ? 'episodes' : 'lessons' ); ?></em></span><?php endforeach; ?></div></div><?php endforeach; ?></div></td>
								<td><span class="tcn-course-table__status tcn-course-table__status--<?php echo esc_attr( $course->post_status ); ?>"><span aria-hidden="true">●</span> <?php echo esc_html( ucfirst( $course->post_status ) ); ?></span></td>
								<td><?php self::render_list_actions( $edit_url, $delete_url, $course ); ?></td>
							</tr>
							<?php endforeach; ?>
							</tbody>
						</table>
					</div>
				</div>

				<div class="tcn-course-view tcn-course-view--card" data-course-view-panel="card" hidden>
				<div class="tcn-course-cards">
					<?php foreach ( $courses as $course ) :
						$types        = wp_get_post_terms( $course->ID, 'course_type', array( 'fields' => 'names' ) );
						$lesson_count = self::count_lessons( $course->ID );
						$languages    = self::get_course_languages( $course->ID );
						$primary_language = reset( $languages );
						$primary_levels = is_array( $primary_language ) && isset( $primary_language['levels'] ) ? $primary_language['levels'] : array();
						$card_image_id = (int) get_post_thumbnail_id( $course->ID );
						if ( ! $card_image_id && ! empty( $primary_levels['beginner']['thumbnail_desktop_id'] ) ) {
							$card_image_id = absint( $primary_levels['beginner']['thumbnail_desktop_id'] );
						}
						if ( ! $card_image_id && ! empty( $primary_levels['beginner']['image_desktop_id'] ) ) {
							$card_image_id = absint( $primary_levels['beginner']['image_desktop_id'] );
						}
						$card_image_url = $card_image_id ? wp_get_attachment_image_url( $card_image_id, 'large' ) : '';
						$details_id = 'tcn-course-card-details-' . (int) $course->ID;
						$configured_levels = array();
						foreach ( $languages as $language_data ) {
							foreach ( (array) $language_data['levels'] as $level_slug => $level ) {
								if ( ! empty( $level['enabled'] ) ) {
									$configured_levels[ $level_slug ] = $level['label'];
								}
							}
						}
						$edit_url     = admin_url( 'admin.php?page=' . self::builder_page() . '&course_id=' . $course->ID );
						$delete_url   = wp_nonce_url(
												admin_url( 'admin-post.php?action=' . ( self::is_show_mode() ? 'tcnexus_delete_show' : 'tcnexus_delete_course' ) . '&course_id=' . $course->ID . '&builder_mode=' . ( self::is_show_mode() ? 'show' : 'course' ) ),
							'tcnexus_delete_course_' . $course->ID
						);
					?>
						<div class="tcn-course-card">
							<div class="tcn-course-card__image">
								<?php if ( $card_image_url ) : ?>
									<img src="<?php echo esc_url( $card_image_url ); ?>" alt="" loading="lazy" />
								<?php else : ?>
									<span class="tcn-course-card__image-placeholder"><?php echo esc_html( self::content_label() ); ?> image</span>
								<?php endif; ?>
							</div>
							<div class="tcn-course-card__body">
								<div class="tcn-course-card__heading">
									<h2 class="tcn-course-card__title"><?php echo esc_html( $course->post_title ?: 'Untitled ' . self::content_label() ); ?></h2>
									<span class="tcn-course-card__status tcn-course-card__status--<?php echo esc_attr( $course->post_status ); ?>">
										<span aria-hidden="true">●</span> <?php echo esc_html( ucfirst( $course->post_status ) ); ?>
									</span>
								</div>
								<div class="tcn-course-card__badges">
									<?php foreach ( is_wp_error( $types ) ? array() : $types as $type ) : ?>
										<span class="tcn-course-card__badge"><?php echo esc_html( $type ); ?></span>
									<?php endforeach; ?>
									<span class="tcn-course-card__badge"><?php echo (int) $lesson_count; ?> <?php echo esc_html( self::is_show_mode() ? 'episode' . ( 1 === (int) $lesson_count ? '' : 's' ) : 'lesson' . ( 1 === (int) $lesson_count ? '' : 's' ) ); ?></span>
									<?php foreach ( $languages as $language_slug => $language_data ) : ?>
										<span class="tcn-course-card__badge"><?php echo esc_html( $language_data['label'] ); ?></span>
									<?php endforeach; ?>
									<div class="tcn-course-card__level-badges">
									<?php foreach ( $configured_levels as $level_label ) : ?>
										<span class="tcn-course-card__badge"><?php echo esc_html( $level_label ); ?></span>
									<?php endforeach; ?>
									</div>
								</div>
								<button type="button" class="tcn-course-card__toggle" aria-expanded="false" aria-controls="<?php echo esc_attr( $details_id ); ?>" aria-label="Show language details" title="Show language details">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
								</button>
								<div id="<?php echo esc_attr( $details_id ); ?>" class="tcn-course-card__details" hidden>
									<?php foreach ( $languages as $language_slug => $language_data ) : ?>
										<div class="tcn-course-card__language">
											<div class="tcn-course-card__language-head"><strong><?php echo esc_html( $language_data['label'] ); ?></strong><span><?php echo esc_html( self::is_show_mode() ? 'Episodes' : 'Lessons' ); ?></span></div>
											<div class="tcn-course-card__levels">
												<?php foreach ( (array) $language_data['levels'] as $level_slug => $level ) : ?>
													<?php if ( empty( $level['enabled'] ) ) { continue; } ?>
													<div class="tcn-course-card__level"><span><?php echo esc_html( $level['label'] ); ?></span><em><?php echo (int) self::count_language_level_lessons( $course->ID, $language_slug, $level_slug ); ?> <?php echo esc_html( self::is_show_mode() ? 'episodes' : 'lessons' ); ?></em></div>
												<?php endforeach; ?>
											</div>
										</div>
									<?php endforeach; ?>
								</div>
								<div class="tcn-course-card__actions">
									<a href="<?php echo esc_url( $edit_url ); ?>" class="tcn-course-card__edit">Edit <?php echo esc_html( strtolower( self::content_label() ) ); ?></a>
								</div>
							</div>
							<button
								type="button"
								class="tcn-course-card__delete"
								data-delete-url="<?php echo esc_url( $delete_url ); ?>"
								data-course-title="<?php echo esc_attr( $course->post_title ?: 'Untitled ' . self::content_label() ); ?>"
								aria-label="Delete <?php echo esc_attr( self::content_label() ); ?>"
								title="Delete <?php echo esc_attr( self::content_label() ); ?>"
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M3 6h18" />
									<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
									<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
									<path d="M10 11v6" />
									<path d="M14 11v6" />
								</svg>
							</button>
						</div>
					<?php endforeach; ?>
				</div>
				</div>
			<?php endif; ?>

			<div class="tcn-modal-backdrop" id="tcn-delete-modal">
				<div class="tcn-modal" role="alertdialog" aria-modal="true" aria-labelledby="tcn-delete-modal-title">
					<h2 id="tcn-delete-modal-title">Delete course?</h2>
					<p id="tcn-delete-modal-message">Are you sure you want to delete this course?</p>
					<div class="tcn-modal__actions">
						<button type="button" class="tcn-btn-ghost" id="tcn-delete-modal-cancel">Cancel</button>
						<a href="#" class="tcn-btn-danger" id="tcn-delete-modal-confirm">Delete</a>
					</div>
				</div>
			</div>
		</div>
		<?php
	}

	private static function render_list_actions( $edit_url, $delete_url, $course ) {
		?>
		<div class="tcn-course-table__actions">
			<a href="<?php echo esc_url( $edit_url ); ?>" class="tcn-course-table__edit">Edit</a>
			<button type="button" class="tcn-course-card__delete tcn-course-table__delete" data-delete-url="<?php echo esc_url( $delete_url ); ?>" data-course-title="<?php echo esc_attr( $course->post_title ?: 'Untitled ' . self::content_label() ); ?>" aria-label="Delete <?php echo esc_attr( self::content_label() ); ?>" title="Delete <?php echo esc_attr( self::content_label() ); ?>">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
			</button>
		</div>
		<?php
	}

	private static function render_form( $course_id ) {
		$course = get_post( $course_id );
		if ( ! $course || self::content_type() !== $course->post_type ) {
			echo '<div class="wrap"><p>' . esc_html( self::content_label() ) . ' not found.</p></div>';
			return;
		}

		$all_types   = get_terms( array( 'taxonomy' => 'course_type', 'hide_empty' => false ) );
		$languages_data = self::get_course_languages( $course_id );
		$active_language = isset( $_GET['language'] ) && array_key_exists( sanitize_key( $_GET['language'] ), $languages_data ) ? sanitize_key( $_GET['language'] ) : 'en';
		$levels_data = $languages_data[ $active_language ]['levels'];
		$is_show = self::SHOW_POST_TYPE === $course->post_type;
		$primary_level_slug = $is_show ? 'season-1' : 'beginner';
		$primary_level_data = $levels_data[ $primary_level_slug ] ?? reset( $levels_data );

		$all_people = get_posts( array(
			'post_type'      => 'tc_instructor',
			'posts_per_page' => -1,
			'post_status'    => array( 'publish', 'draft' ),
			'orderby'        => 'title',
			'order'          => 'ASC',
		) );

		// Instructor and Guest are separate roles from the same pool — a
		// person tagged as one never appears in the other's dropdown.
		$instructors = array();
		$guests      = array();
		foreach ( $all_people as $person ) {
			if ( 'guest' === TCNexus_Post_Types::get_person_role( $person->ID ) ) {
				$guests[] = $person;
			} else {
				$instructors[] = $person;
			}
		}
		$characters = get_posts( array(
			'post_type'      => 'tc_character',
			'posts_per_page' => -1,
			'post_status'    => array( 'publish', 'draft' ),
			'orderby'        => 'title',
			'order'          => 'ASC',
		) );

		$authors = get_users( array( 'capability' => array( 'edit_posts' ), 'orderby' => 'display_name' ) );

		$lessons = get_posts( array(
			'post_type'      => 'tc_lesson',
			'posts_per_page' => -1,
			'meta_key'       => '_tcnexus_course_id',
			'meta_value'     => $course_id,
			'orderby'        => 'menu_order',
			'order'          => 'ASC',
			'post_status'    => array( 'publish', 'draft' ),
		) );
		$lessons = array_values( array_filter( $lessons, function ( $lesson ) use ( $active_language ) {
			$lesson_language = get_post_meta( $lesson->ID, self::LANGUAGE_LESSON_META_KEY, true ) ?: 'en';
			return $lesson_language === $active_language;
		} ) );
		$lesson_views = TCNexus_Access_Control::count_views_for_lessons( wp_list_pluck( $lessons, 'ID' ) );

		$tabs = array(
			'basics' => 'Basics',
			'media'  => 'Media',
			'people' => self::is_show_mode() ? 'Characters' : 'Instructors',
			'links'  => 'Links',
		);
		$active_tab = isset( $_GET['tab'] ) && array_key_exists( $_GET['tab'], $tabs ) ? $_GET['tab'] : 'basics';
		$requested_level = sanitize_key( $_GET[ $is_show ? 'season' : 'level' ] ?? '' );
		$active_level = isset( $levels_data[ $requested_level ] ) ? $requested_level : $primary_level_slug;
		// "Save Lesson & Add New" (see the Lessons card's own Save buttons,
		// below #tcnexus-builder) redirects back here with this set, so the
		// blank row for the next lesson is already waiting after the reload.
		$add_row_on_load = isset( $_GET['add_row'] ) && '1' === $_GET['add_row'];
		$active_level_data = $levels_data[ $active_level ];
		$active_title = $active_level_data['title'];
		$active_slug  = $active_level_data['course_slug'];
		if ( ! $is_show && 'beginner' !== $active_level ) {
			$active_title = $active_title ?: ( $primary_level_data['title'] ?: $course->post_title ) . ' - ' . self::LEVELS[ $active_level ];
			$active_slug  = $active_slug ?: self::level_slug( $active_language, $primary_level_data['course_slug'] ?: $course->post_name, $active_level );
		}
		?>
		<div class="wrap tcn-builder-wrap">
			<a href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::builder_page() ) ); ?>" class="tcn-back-link">
				<span aria-hidden="true">&larr;</span> Back To All <?php echo esc_html( self::content_label( true ) ); ?>
			</a>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="<?php echo self::is_show_mode() ? 'tcnexus_save_show' : 'tcnexus_save_course'; ?>" />
				<input type="hidden" name="builder_mode" value="<?php echo self::is_show_mode() ? 'show' : 'course'; ?>" />
				<input type="hidden" name="course_id" value="<?php echo esc_attr( $course_id ); ?>" />
				<input type="hidden" name="active_level" id="tcnexus-active-level" value="<?php echo esc_attr( $active_level ); ?>" />
				<input type="hidden" name="active_language" id="tcnexus-active-language" value="<?php echo esc_attr( $active_language ); ?>" />
				<input type="hidden" name="active_tab" id="tcnexus-active-tab" value="<?php echo esc_attr( $active_tab ); ?>" />
				<input type="hidden" name="new_language" id="tcnexus-new-language" value="" />
				<input type="hidden" name="new_season" id="tcnexus-new-show-season" value="" />
				<input type="hidden" name="remove_language" id="tcnexus-remove-language" value="" />
				<input type="hidden" name="new_course" id="tcnexus-new-course" value="<?php echo isset( $_GET['new'] ) && '1' === $_GET['new'] ? '1' : '0'; ?>" />
				<?php wp_nonce_field( 'tcnexus_course_builder', 'tcnexus_course_builder_nonce' ); ?>

				<div id="tcnexus-builder" <?php if ( $add_row_on_load ) : ?>data-add-lesson-row="1"<?php endif; ?> <?php if ( isset( $_GET['new'] ) && '1' === $_GET['new'] ) : ?>data-new-course="1" data-new-course-delete-url="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=' . ( self::is_show_mode() ? 'tcnexus_delete_show' : 'tcnexus_delete_course' ) . '&course_id=' . $course_id . '&builder_mode=' . ( self::is_show_mode() ? 'show' : 'course' ) ), 'tcnexus_delete_course_' . $course_id ) ); ?>"<?php endif; ?>>
					<div class="tcn-course-language-tabs" role="tablist" aria-label="Course languages">
						<?php foreach ( $languages_data as $language_slug => $language_data ) : ?>
							<?php $language_url = add_query_arg( array( 'page' => self::builder_page(), 'course_id' => $course_id, 'language' => $language_slug, ( $is_show ? 'season' : 'level' ) => $active_level ), admin_url( 'admin.php' ) ); ?>
							<a class="tcn-course-language-tab<?php echo $language_slug === $active_language ? ' is-active' : ''; ?>" data-language="<?php echo esc_attr( $language_slug ); ?>" href="<?php echo esc_url( $language_url ); ?>" role="tab" aria-selected="<?php echo $language_slug === $active_language ? 'true' : 'false'; ?>">
								<span><?php echo esc_html( $language_data['label'] ); ?></span>
								<span class="tcn-course-language-tab__remove<?php echo 'en' === $language_slug ? ' is-disabled' : ''; ?>" aria-label="Remove <?php echo esc_attr( $language_data['label'] ); ?> language"><span class="tcn-course-language-tab__remove-glyph">&times;</span></span>
							</a>
						<?php endforeach; ?>
						<button type="button" class="tcn-course-language-tab tcn-course-language-tab--add" id="tcnexus-add-course-language" aria-label="Add course language">+</button>
					</div>

					<div class="tcn-level-tabs" role="tablist" aria-label="<?php echo esc_attr( $is_show ? 'Show seasons' : 'Course levels' ); ?>">
						<?php foreach ( $levels_data as $level_slug => $level_data ) : ?>
							<button type="button" class="tcn-level-tab<?php echo $level_slug === $active_level ? ' is-active' : ''; ?>" data-level="<?php echo esc_attr( $level_slug ); ?>" aria-selected="<?php echo $level_slug === $active_level ? 'true' : 'false'; ?>">
								<span class="tcn-level-tab__label"><?php echo esc_html( $level_data['label'] ); ?></span>
								<?php if ( ! empty( $level_data['enabled'] ) ) : ?><span class="tcn-level-tab__dot" aria-label="<?php echo esc_attr( $is_show ? 'Active season' : 'Active level' ); ?>"></span><?php endif; ?>
							</button>
						<?php endforeach; ?>
						<?php if ( $is_show ) : ?>
							<button type="button" class="tcn-level-tab tcn-level-tab--add" id="tcnexus-add-show-season" aria-label="Add season" title="Add season">+</button>
						<?php endif; ?>
					</div>

					<?php if ( ! $is_show ) : ?><div class="tcn-level-includes" aria-label="Include course level">
						<?php foreach ( self::LEVELS as $level_slug => $level_label ) : ?>
							<label class="tcn-level-include" data-level-include="<?php echo esc_attr( $level_slug ); ?>" <?php echo $level_slug === $active_level ? '' : 'hidden'; ?>>
								<input type="checkbox" name="levels[<?php echo esc_attr( $level_slug ); ?>][enabled]" value="1" <?php checked( ! empty( $levels_data[ $level_slug ]['enabled'] ) ); ?> />
								<span class="tcn-level-include__toggle" aria-hidden="true"></span>
								<span class="tcn-level-include__label">Include this level</span>
							</label>
						<?php endforeach; ?>
					</div><?php endif; ?>

					<div class="tcn-header">
						<div class="tcn-header__title-row">
							<p class="tcn-header__eyebrow"><?php echo esc_html( self::content_label() ); ?></p>
							<input type="text" id="course_title" name="course_title" class="tcn-title-input" value="<?php echo esc_attr( $active_title ?: ( 'en' === $active_language ? $course->post_title : '' ) ); ?>" placeholder="Course title" />
							<div class="tcn-slug-row">
								<span class="tcn-slug-prefix"><?php echo esc_html( $is_show ? '/shows/' : '/courses/' ); ?></span>
								<input type="text" id="course_slug" name="course_slug" class="tcn-slug-input" value="<?php echo esc_attr( $active_slug ?: ( 'en' === $active_language ? $course->post_name : '' ) ); ?>" />
							</div>
						</div>
						<div class="tcn-header__actions">
							<div class="tcn-status-toggle">
								<input type="radio" id="status_draft" name="course_status" value="draft" <?php checked( $course->post_status, 'draft' ); ?> />
								<label for="status_draft">Draft</label>
								<input type="radio" id="status_publish" name="course_status" value="publish" <?php checked( 'publish', $course->post_status ); ?> />
								<label for="status_publish">Published</label>
							</div>
							<button type="submit" class="tcn-btn-ghost tcn-header__save-btn" id="tcnexus-save-course">Save <?php echo esc_html( self::content_label() ); ?></button>
							<?php if ( isset( $_GET['saved'] ) ) : ?>
								<div class="tcn-save-confirmation" role="status"><?php echo esc_html( self::content_label() ); ?> saved.</div>
							<?php endif; ?>
						</div>
					</div>

					<div class="tcn-tabs" role="tablist">
						<?php foreach ( $tabs as $key => $label ) : ?>
							<button type="button" class="tcn-tab" data-tab="<?php echo esc_attr( $key ); ?>" aria-controls="tcn-panel-<?php echo esc_attr( $key ); ?>" aria-selected="<?php echo $key === $active_tab ? 'true' : 'false'; ?>"><?php echo esc_html( $label ); ?></button>
						<?php endforeach; ?>
					</div>

					<?php foreach ( $levels_data as $level_slug => $level_data ) :
						$selected_types       = (array) $level_data['course_types'];
						$language             = $level_data['language'];
						$image_desktop_id     = (int) $level_data['image_desktop_id'];
						$image_mobile_id      = (int) $level_data['image_mobile_id'];
						$thumbnail_desktop_id = (int) $level_data['thumbnail_desktop_id'];
						$thumbnail_mobile_id  = (int) $level_data['thumbnail_mobile_id'];
						$landing_background_id = (int) ( $level_data['landing_background_id'] ?? 0 );
						$title_image_id      = (int) ( $level_data['title_image_id'] ?? 0 );
						$instructor_ids       = array_values( array_filter( array_map( 'absint', (array) ( $level_data['instructor_ids'] ?? array( $level_data['instructor_id'] ?? 0 ) ) ) ) );
						$character_ids        = array_values( array_filter( array_map( 'absint', (array) ( $level_data['character_ids'] ?? array() ) ) ) );
						$overview_link        = $level_data['overview_link'];
						$trailer_link         = $level_data['trailer_link'];
					?>
					<div class="tcn-level-panel<?php echo $level_slug === $active_level ? ' is-active' : ''; ?>" data-level-panel="<?php echo esc_attr( $level_slug ); ?>" <?php echo $level_slug === $active_level ? '' : 'hidden'; ?>>

					<!-- Basics -->
					<div class="tcn-panel<?php echo 'basics' === $active_tab ? ' is-active' : ''; ?>" id="tcn-panel-<?php echo esc_attr( $level_slug . '-basics' ); ?>">
						<input type="hidden" id="course_title_<?php echo esc_attr( $level_slug ); ?>" name="levels[<?php echo esc_attr( $level_slug ); ?>][title]" data-level-title="<?php echo esc_attr( $level_slug ); ?>" value="<?php echo esc_attr( $level_data['title'] ); ?>" />
						<input type="hidden" name="levels[<?php echo esc_attr( $level_slug ); ?>][course_slug]" data-level-slug="<?php echo esc_attr( $level_slug ); ?>" value="<?php echo esc_attr( $level_data['course_slug'] ); ?>" />
						<div class="tcn-row">
							<div class="tcn-field">
								<label class="tcn-field__label">Author</label>
								<select name="course_author" class="tcn-select">
									<?php foreach ( $authors as $user ) : ?>
										<option value="<?php echo esc_attr( $user->ID ); ?>" <?php selected( (int) $course->post_author, $user->ID ); ?>><?php echo esc_html( $user->display_name ); ?></option>
									<?php endforeach; ?>
								</select>
							</div>
						</div>

						<div class="tcn-field">
							<label class="tcn-field__label"><?php echo self::is_show_mode() ? 'Category' : 'Course Type'; ?></label>
							<?php if ( self::is_show_mode() ) : ?>
								<input type="hidden" name="levels[<?php echo esc_attr( $level_slug ); ?>][course_types][]" value="<?php echo esc_attr( self::SHOW_CATEGORY ); ?>" />
								<p class="tcn-field__hint">Shows are assigned to the Shows category automatically.</p>
							<?php else : ?>
							<div class="tcn-checkbox-group">
								<?php foreach ( $all_types as $term ) : ?>
									<div class="tcn-chip-checkbox">
										<input type="checkbox" id="type_<?php echo esc_attr( $level_slug . '_' . $term->slug ); ?>" name="levels[<?php echo esc_attr( $level_slug ); ?>][course_types][]" value="<?php echo esc_attr( $term->slug ); ?>" <?php checked( in_array( $term->slug, $selected_types, true ) ); ?> />
										<label for="type_<?php echo esc_attr( $level_slug . '_' . $term->slug ); ?>"><?php echo esc_html( $term->name ); ?></label>
									</div>
								<?php endforeach; ?>
							</div>
							<?php if ( empty( $all_types ) ) : ?>
								<p class="tcn-field__hint">No course types yet — add some under Courses &rarr; Course Types.</p>
							<?php endif; ?>
							<?php endif; ?>
						</div>

						<div class="tcn-field">
												<label class="tcn-field__label" for="course_content_<?php echo esc_attr( $level_slug ); ?>">Description</label>
							<?php
							wp_editor( $level_data['content'], 'course_content_' . $level_slug, array(
								'textarea_name' => 'levels[' . $level_slug . '][content]',
								'textarea_rows' => 8,
								'media_buttons' => false,
							) );
							?>
						</div>
					</div>

					<!-- Media -->
					<div class="tcn-panel<?php echo 'media' === $active_tab ? ' is-active' : ''; ?>" id="tcn-panel-<?php echo esc_attr( $level_slug . '-media' ); ?>">
						<div class="tcn-field">
							<label class="tcn-field__label">Landing Page Background Image — 8:3</label>
							<div class="tcn-media-grid tcn-course-media-grid" style="grid-template-columns:minmax(220px,320px);">
								<?php self::render_media_picker( 'Desktop', 'levels[' . $level_slug . '][landing_background_id]', $landing_background_id, 'Select landing page background image', 1920, 720 ); ?>
							</div>
						</div>
						<div class="tcn-field">
							<label class="tcn-field__label">Title Image — 600 × 160px</label>
							<div class="tcn-media-grid tcn-course-media-grid" style="grid-template-columns:minmax(220px,320px);">
								<?php self::render_media_picker( 'Desktop', 'levels[' . $level_slug . '][title_image_id]', $title_image_id, 'Select title image', 600, 160 ); ?>
							</div>
							<p class="tcn-field__hint">Displayed on the main featured slider and the single course/show page. Text title is used when no image is selected.</p>
						</div>
						<div class="tcn-field">
							<label class="tcn-field__label">Course Image — main image for the course single page</label>
							<div class="tcn-media-grid tcn-course-media-grid">
								<?php
								self::render_media_picker( 'Desktop', 'levels[' . $level_slug . '][image_desktop_id]', $image_desktop_id, 'Select course image (desktop)', 1920, 1080 );
								self::render_media_picker( 'Mobile', 'levels[' . $level_slug . '][image_mobile_id]', $image_mobile_id, 'Select course image (mobile)', 1080, 1350 );
								?>
							</div>
						</div>
						<div class="tcn-field">
							<label class="tcn-field__label">Course Thumbnail — used in course grids/cards</label>
							<div class="tcn-media-grid tcn-course-media-grid">
								<?php
								self::render_media_picker( 'Desktop', 'levels[' . $level_slug . '][thumbnail_desktop_id]', $thumbnail_desktop_id, 'Select course thumbnail (desktop)', 1280, 720 );
								self::render_media_picker( 'Mobile', 'levels[' . $level_slug . '][thumbnail_mobile_id]', $thumbnail_mobile_id, 'Select course thumbnail (mobile)', 640, 360 );
								?>
							</div>
						</div>
					</div>

					<!-- People / Characters -->
					<div class="tcn-panel<?php echo 'people' === $active_tab ? ' is-active' : ''; ?>" id="tcn-panel-<?php echo esc_attr( $level_slug . '-people' ); ?>">
						<?php if ( self::is_show_mode() ) : ?>
						<div class="tcn-field">
							<label class="tcn-field__label" for="characters_<?php echo esc_attr( $level_slug ); ?>">Characters</label>
							<select id="characters_<?php echo esc_attr( $level_slug ); ?>" class="tcn-select" data-character-picker="1" data-character-input-name="levels[<?php echo esc_attr( $level_slug ); ?>][character_ids][]" aria-describedby="characters_hint_<?php echo esc_attr( $level_slug ); ?>">
								<option value="">Select a character…</option>
								<?php foreach ( $characters as $character ) : ?>
									<option value="<?php echo esc_attr( $character->ID ); ?>"><?php echo esc_html( $character->post_title ); ?></option>
								<?php endforeach; ?>
							</select>
							<div class="tcn-character-list" data-character-list="<?php echo esc_attr( $level_slug ); ?>">
								<p class="tcn-character-list__title">Selected Characters</p>
								<div class="tcn-character-list__items">
									<?php foreach ( $character_ids as $character_id ) : $character = get_post( absint( $character_id ) ); if ( ! $character ) { continue; } ?>
										<div class="tcn-character-list__item" data-character-id="<?php echo esc_attr( $character->ID ); ?>">
											<span><?php echo esc_html( $character->post_title ); ?></span>
											<input type="hidden" name="levels[<?php echo esc_attr( $level_slug ); ?>][character_ids][]" value="<?php echo esc_attr( $character->ID ); ?>" />
											<button type="button" class="tcn-character-list__remove" aria-label="Remove <?php echo esc_attr( $character->post_title ); ?>">×</button>
										</div>
									<?php endforeach; ?>
								</div>
							</div>
							<p class="tcn-field__hint" id="characters_hint_<?php echo esc_attr( $level_slug ); ?>">Select characters from the dropdown. They will appear in the list below.</p>
						</div>
						<?php else : ?>
							<?php
							self::render_instructor_field( 'levels[' . $level_slug . '][instructor_ids][]', $instructor_ids, $instructors, $level_slug );
							?>
						<?php endif; ?>

						<?php if ( 'beginner' === $level_slug ) : ?>
						<!-- Rendered once, reused for both fields above — the "+" button
						     records which <select> to update in data-target-select. -->
						<div class="tcn-modal-backdrop" id="tcn-quick-person-modal">
							<div class="tcn-modal">
								<h2 id="tcn-quick-person-title">Add Person</h2>
								<div class="tcn-field">
									<label class="tcn-field__label" for="tcn-quick-person-name">Name</label>
									<input type="text" id="tcn-quick-person-name" class="tcn-input" />
								</div>
								<div class="tcn-field">
									<label class="tcn-field__label">Photo</label>
									<div class="tcn-media-grid" style="grid-template-columns:minmax(180px,240px);">
										<?php TCNexus_Media::render_picker( 'Select Photo', 'quick_person_photo', 0, 'Select photo', 500, 500 ); ?>
									</div>
								</div>
								<div class="tcn-field">
									<label class="tcn-field__label" for="tcn-quick-person-bio">Bio</label>
									<textarea id="tcn-quick-person-bio" class="tcn-textarea" rows="4"></textarea>
								</div>
								<p class="tcn-cropper-error" id="tcn-quick-person-error" style="display:none;"></p>
								<div class="tcn-modal__actions">
									<button type="button" class="tcn-btn-ghost" id="tcn-quick-person-cancel">Cancel</button>
									<button type="button" class="tcn-save-btn" id="tcn-quick-person-create">Create</button>
								</div>
							</div>
						</div>
						<?php endif; ?>
					</div>

					<!-- Links -->
					<div class="tcn-panel<?php echo 'links' === $active_tab ? ' is-active' : ''; ?>" id="tcn-panel-<?php echo esc_attr( $level_slug . '-links' ); ?>">
						<div class="tcn-field">
							<label class="tcn-field__label" for="overview_link_<?php echo esc_attr( $level_slug ); ?>">Course Overview Link</label>
							<input type="url" id="overview_link_<?php echo esc_attr( $level_slug ); ?>" name="levels[<?php echo esc_attr( $level_slug ); ?>][overview_link]" class="tcn-input" value="<?php echo esc_attr( $overview_link ); ?>" placeholder="https://…" />
						</div>
						<div class="tcn-field">
							<label class="tcn-field__label" for="trailer_link_<?php echo esc_attr( $level_slug ); ?>">Course Trailer Link</label>
							<input type="url" id="trailer_link_<?php echo esc_attr( $level_slug ); ?>" name="levels[<?php echo esc_attr( $level_slug ); ?>][trailer_link]" class="tcn-input" value="<?php echo esc_attr( $trailer_link ); ?>" placeholder="https://vimeo.com/…" />
						</div>
					</div>

					</div>
					<?php endforeach; ?>

				</div>

				<!-- Lessons — a separate card below the course-details card
				     above, not one of its tabs. Still inside the same <form>
				     so "Save Lesson" submits alongside everything else. -->
				<?php $lesson_label = self::is_show_mode() ? 'Episode' : 'Lesson'; ?>
				<div class="tcn-lessons-card">
					<div class="tcn-lessons-card__header">
						<h2 class="tcn-lessons-card__title"><?php echo esc_html( $lesson_label . 's' ); ?></h2>
						<button type="button" class="tcn-btn-ghost tcn-add-lesson-btn">+ Add <?php echo esc_html( $lesson_label ); ?></button>
					</div>

					<table class="tcn-lessons-overview">
						<thead>
							<tr>
							<th class="tcn-lessons-overview__order"><?php echo esc_html( $lesson_label . ' No.' ); ?></th>
								<th>Title</th>
								<th class="tcn-lessons-overview__level">Tier</th>
								<th class="tcn-lessons-overview__duration">Duration</th>
								<th class="tcn-lessons-overview__video-id">ID</th>
								<th class="tcn-lessons-overview__views">Views</th>
							</tr>
						</thead>
						<tbody id="tcnexus-lessons-list">
							<?php if ( empty( $lessons ) ) : ?>
								<tr class="tcn-lessons-empty-row" id="tcnexus-lessons-empty">
								<td colspan="6"><div class="tcn-lessons-empty__content"><span>No <?php echo esc_html( strtolower( $lesson_label ) . 's' ); ?> yet.</span><button type="button" class="tcn-btn-ghost tcn-add-lesson-btn">+ Add <?php echo esc_html( $lesson_label ); ?></button></div></td>
								</tr>
							<?php else : ?>
								<?php foreach ( $lessons as $index => $lesson ) :
									$lesson_level        = get_post_meta( $lesson->ID, self::LEVEL_LESSON_META_KEY, true ) ?: $primary_level_slug;
									$lesson_level        = isset( $levels_data[ $lesson_level ] ) ? $lesson_level : $primary_level_slug;
									$existing_name       = 'levels[' . $lesson_level . '][lessons][existing][' . $lesson->ID . ']';
									$tier              = TCNexus_Post_Types::get_lesson_tier( $lesson->ID );
									$video_id          = get_post_meta( $lesson->ID, '_tcnexus_vimeo_id', true );
					$video_source      = get_post_meta( $lesson->ID, '_tcnexus_video_source', true ) ?: 'vimeo';
					$duration          = get_post_meta( $lesson->ID, '_tcnexus_duration', true );
					$description       = $lesson->post_content;
					$tc_lens_timeline  = self::get_lesson_tc_lens_timeline( $lesson->ID );
					$thumbnail_id      = get_post_thumbnail_id( $lesson->ID );
					$lesson_person_ids = self::is_show_mode() ? self::get_lesson_character_ids( $lesson->ID ) : self::get_lesson_guest_ids( $lesson->ID );
					$row_key           = $lesson->ID;
					$video_placeholder = 'youtube' === $video_source ? 'YouTube Video ID' : 'Vimeo Video ID';
					$views             = isset( $lesson_views[ $lesson->ID ] ) ? $lesson_views[ $lesson->ID ] : 0;
								?>
									<tr class="tcn-lesson-row" data-lesson-level="<?php echo esc_attr( $lesson_level ); ?>">
										<td class="tcn-lessons-overview__order"><?php echo esc_html( sprintf( '%02d', $lesson->menu_order ?: ( $index + 1 ) ) ); ?></td>
										<td>
											<div class="tcn-lesson-row__title">
												<svg class="tcn-lesson-row__chevron" width="16" height="16" viewBox="0 0 24 24"><polygon points="8,5 8,19 18,12" fill="#E5E3DB" /></svg>
												<span><?php echo esc_html( $lesson->post_title ); ?></span>
											</div>
										</td>
										<td class="tcn-lessons-overview__level"><span class="tcn-level-chip tcn-level-chip--<?php echo esc_attr( $tier ); ?>"><?php echo esc_html( ucfirst( $tier ) ); ?></span></td>
										<td class="tcn-lessons-overview__duration"><?php echo esc_html( $duration ?: '—' ); ?></td>
										<td class="tcn-lessons-overview__video-id"><?php echo esc_html( $lesson->ID ); ?></td>
										<td class="tcn-lessons-overview__views"><?php echo esc_html( number_format_i18n( $views ) ); ?></td>
									</tr>
									<tr class="tcn-lesson-expand" data-lesson-level="<?php echo esc_attr( $lesson_level ); ?>">
											<td colspan="6">
											<div class="tcn-lesson-expand__panel">
												<div class="tcn-lesson-card">
													<button type="button" class="tcn-lesson-card__delete tcn-remove-row" aria-label="Remove lesson">
														<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
															<path d="M4 7h16"></path>
															<path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"></path>
															<path d="M6 7l1 13a2 2 0 0 0 2 1.9h6a2 2 0 0 0 2-1.9l1-13"></path>
															<path d="M10 11v6"></path>
															<path d="M14 11v6"></path>
														</svg>
													</button>
													<div class="tcn-lesson-card__media">
																<?php TCNexus_Media::render_picker( 'Select Image', $existing_name . '[thumbnail_id]', $thumbnail_id, 'Select ' . strtolower( $lesson_label ) . ' image', 640, 360 ); ?>
																<div class="tcn-lesson-card__video-id"><span>Video ID</span><code><?php echo esc_html( $lesson->ID ); ?></code></div>
													</div>
													<div class="tcn-lesson-card__body">
														<div class="tcn-lesson-card__row tcn-lesson-card__row--top">
															<div class="tcn-lesson-card__order">
																<label class="tcn-field__label">Order</label>
																<select name="<?php echo esc_attr( $existing_name . '[order]' ); ?>" class="tcn-select">
																	<?php self::render_order_options( $lesson->menu_order ?: ( $index + 1 ) ); ?>
																</select>
															</div>
															<div class="tcn-lesson-card__title">
																<label class="tcn-field__label">Title</label>
																<input type="text" name="<?php echo esc_attr( $existing_name . '[title]' ); ?>" value="<?php echo esc_attr( $lesson->post_title ); ?>" />
															</div>
															<div class="tcn-lesson-card__description">
																<label class="tcn-field__label">Description</label>
											<textarea name="<?php echo esc_attr( $existing_name . '[description]' ); ?>" rows="2" placeholder="Short description shown with this lesson"><?php echo esc_textarea( $description ); ?></textarea>
										</div>
											</div>
										<div class="tcn-lesson-card__row tcn-lesson-card__row--video">
																		<?php self::render_video_source_toggle( $existing_name . '[video_source]', "video_source_{$row_key}", $video_source ); ?>
																		<input type="text" class="tcn-video-id-input" name="<?php echo esc_attr( $existing_name . '[vimeo_id]' ); ?>" value="<?php echo esc_attr( $video_id ); ?>" placeholder="<?php echo esc_attr( $video_placeholder ); ?>" />
														</div>
														<div class="tcn-lesson-card__row tcn-lesson-card__row--meta">
															<div class="tcn-lesson-card__duration">
																<label class="tcn-field__label">Duration</label>
																		<input type="text" class="tcn-duration-input" name="<?php echo esc_attr( $existing_name . '[duration]' ); ?>" value="<?php echo esc_attr( $duration ); ?>" placeholder="e.g. 12:45" />
															</div>
															<div class="tcn-lesson-card__tier">
																<label class="tcn-field__label">Tier</label>
																<?php self::render_tier_toggle( $existing_name . '[tier]', "tier_{$row_key}", $tier ); ?>
															</div>
															</div>
										<?php self::render_lesson_guest_field( self::is_show_mode() ? $existing_name . '[character_ids][]' : $existing_name . '[guest_ids][]', $lesson_person_ids, self::is_show_mode() ? $characters : $guests, $lesson_label, self::is_show_mode() ? 'character' : 'guest' ); ?>
										<?php self::render_tc_lens_timeline_field( $existing_name, $tc_lens_timeline, true ); ?>
											<div class="tcn-lesson-card__footer">
																		<input type="checkbox" class="tcn-lesson-delete-flag" name="<?php echo esc_attr( $existing_name . '[delete]' ); ?>" value="1" style="display:none;" />
																															<button type="submit" name="lesson_action" value="save" class="tcn-btn-ghost">Save <?php echo esc_html( $lesson_label ); ?></button>
																															<button type="submit" name="lesson_action" value="save_add_new" class="tcn-btn-ghost">Save and Add New <?php echo esc_html( $lesson_label ); ?></button>
																															<button type="button" class="tcn-btn-ghost tcn-add-lesson-btn">+ Add <?php echo esc_html( $lesson_label ); ?></button>
														</div>
													</div>
												</div>
											</div>
										</td>
									</tr>
								<?php endforeach; ?>
							<?php endif; ?>
						</tbody>
					</table>

					<template id="tcnexus-lesson-row-template">
						<tr class="tcn-lesson-row is-open" data-lesson-level="__LEVEL__">
							<td class="tcn-lessons-overview__order">—</td>
							<td>
								<div class="tcn-lesson-row__title">
									<svg class="tcn-lesson-row__chevron" width="16" height="16" viewBox="0 0 24 24"><polygon points="8,5 8,19 18,12" fill="#E5E3DB" /></svg>
									<span>New lesson</span>
								</div>
							</td>
							<td class="tcn-lessons-overview__level"><span class="tcn-level-chip tcn-level-chip--free">Free</span></td>
							<td class="tcn-lessons-overview__duration">—</td>
							<td class="tcn-lessons-overview__video-id">—</td>
							<td class="tcn-lessons-overview__views">0</td>
						</tr>
						<tr class="tcn-lesson-expand is-open" data-lesson-level="__LEVEL__">
											<td colspan="6">
								<div class="tcn-lesson-expand__panel">
									<div class="tcn-lesson-card">
										<button type="button" class="tcn-lesson-card__delete tcn-remove-row" aria-label="Remove lesson">
											<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
												<path d="M4 7h16"></path>
												<path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"></path>
												<path d="M6 7l1 13a2 2 0 0 0 2 1.9h6a2 2 0 0 0 2-1.9l1-13"></path>
												<path d="M10 11v6"></path>
												<path d="M14 11v6"></path>
											</svg>
										</button>
										<div class="tcn-lesson-card__media">
															<?php TCNexus_Media::render_picker( 'Select Image', 'levels[__LEVEL__][lessons][new][__INDEX__][thumbnail_id]', 0, 'Select ' . strtolower( $lesson_label ) . ' image', 640, 360 ); ?>
															<div class="tcn-lesson-card__video-id"><span>Video ID</span><code>Assigned after save</code></div>
										</div>
										<div class="tcn-lesson-card__body">
											<div class="tcn-lesson-card__row tcn-lesson-card__row--top">
												<div class="tcn-lesson-card__order">
													<label class="tcn-field__label">Order</label>
													<select name="levels[__LEVEL__][lessons][new][__INDEX__][order]" class="tcn-select">
														<?php self::render_order_options( 1 ); ?>
													</select>
												</div>
												<div class="tcn-lesson-card__title">
													<label class="tcn-field__label">Title</label>
													<input type="text" name="levels[__LEVEL__][lessons][new][__INDEX__][title]" placeholder="Lesson title" />
												</div>
																						<div class="tcn-lesson-card__description">
																							<label class="tcn-field__label">Description</label>
																								<textarea name="levels[__LEVEL__][lessons][new][__INDEX__][description]" rows="2" placeholder="Short description shown with this lesson"></textarea>
																							</div>
												<div class="tcn-lesson-card__row tcn-lesson-card__row--video">
																	<?php self::render_video_source_toggle( 'levels[__LEVEL__][lessons][new][__INDEX__][video_source]', 'video_source___INDEX__', 'vimeo' ); ?>
																	<input type="text" class="tcn-video-id-input" name="levels[__LEVEL__][lessons][new][__INDEX__][vimeo_id]" placeholder="Vimeo Video ID" />
											</div>
											<div class="tcn-lesson-card__row tcn-lesson-card__row--meta">
												<div class="tcn-lesson-card__duration">
													<label class="tcn-field__label">Duration</label>
																	<input type="text" class="tcn-duration-input" name="levels[__LEVEL__][lessons][new][__INDEX__][duration]" placeholder="e.g. 12:45" />
												</div>
												<div class="tcn-lesson-card__tier">
													<label class="tcn-field__label">Tier</label>
																									<?php self::render_tier_toggle( 'levels[__LEVEL__][lessons][new][__INDEX__][tier]', 'tier___INDEX__', 'free' ); ?>
																									</div>
																								</div>
													<?php self::render_lesson_guest_field( self::is_show_mode() ? 'levels[__LEVEL__][lessons][new][__INDEX__][character_ids][]' : 'levels[__LEVEL__][lessons][new][__INDEX__][guest_ids][]', array(), self::is_show_mode() ? $characters : $guests, $lesson_label, self::is_show_mode() ? 'character' : 'guest' ); ?>
													<?php self::render_tc_lens_timeline_field( 'levels[__LEVEL__][lessons][new][__INDEX__]', array(), true ); ?>
													<div class="tcn-lesson-card__footer">
																																			<button type="submit" name="lesson_action" value="save" class="tcn-btn-ghost">Save <?php echo esc_html( $lesson_label ); ?></button>
																																			<button type="submit" name="lesson_action" value="save_add_new" class="tcn-btn-ghost">Save and Add New <?php echo esc_html( $lesson_label ); ?></button>
																																			<button type="button" class="tcn-btn-ghost tcn-add-lesson-btn">+ Add <?php echo esc_html( $lesson_label ); ?></button>
											</div>
										</div>
									</div>
								</div>
							</td>
						</tr>
					</template>
				</div>
			</form>

			<div class="tcn-modal-backdrop tcn-course-language-modal" id="tcn-course-language-modal">
				<div class="tcn-modal" role="dialog" aria-modal="true" aria-labelledby="tcn-course-language-modal-title">
					<h2 id="tcn-course-language-modal-title">Add course language</h2>
					<p>Choose a language for another complete version of this course. Its levels and lessons will be managed separately.</p>
					<select class="tcn-select" id="tcn-course-language-select">
						<?php foreach ( self::LANGUAGES as $language_slug => $language_label ) : ?>
							<?php if ( ( isset( $_GET['new'] ) && '1' === $_GET['new'] ) || ! isset( $languages_data[ $language_slug ] ) ) : ?><option value="<?php echo esc_attr( $language_slug ); ?>" <?php selected( 'en', $language_slug ); ?>><?php echo esc_html( $language_label ); ?></option><?php endif; ?>
						<?php endforeach; ?>
					</select>
					<div class="tcn-modal__actions">
						<button type="button" class="tcn-btn-ghost" id="tcn-course-language-cancel">Cancel</button>
						<button type="button" class="tcn-save-btn" id="tcn-course-language-continue">Continue</button>
					</div>
				</div>
			</div>

			<div class="tcn-modal-backdrop" id="tcn-course-language-remove-modal">
				<div class="tcn-modal tcn-unsaved-modal" role="alertdialog" aria-modal="true" aria-labelledby="tcn-course-language-remove-title" aria-describedby="tcn-course-language-remove-message">
					<div class="tcn-unsaved-modal__icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" focusable="false">
							<path class="tcn-unsaved-modal__triangle" d="M10.9 4.5a1.25 1.25 0 0 1 2.2 0l8 14.2a1.25 1.25 0 0 1-1.1 1.8H4a1.25 1.25 0 0 1-1.1-1.8l8-14.2Z" />
							<path class="tcn-unsaved-modal__mark" d="M12 9v5m0 3.2v.1" />
						</svg>
					</div>
					<h2 id="tcn-course-language-remove-title">Remove this language?</h2>
					<p id="tcn-course-language-remove-message">Everything under this language will be deleted, including its levels and lessons.</p>
					<div class="tcn-modal__actions">
						<button type="button" class="tcn-btn-ghost" id="tcn-course-language-remove-cancel">Cancel</button>
						<button type="button" class="tcn-btn-danger" id="tcn-course-language-remove-confirm">Delete language</button>
					</div>
				</div>
			</div>

			<div class="tcn-modal-backdrop" id="tcn-unsaved-modal">
				<div class="tcn-modal tcn-unsaved-modal" role="alertdialog" aria-modal="true" aria-labelledby="tcn-unsaved-modal-title" aria-describedby="tcn-unsaved-modal-message">
					<div class="tcn-unsaved-modal__icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" focusable="false">
							<path class="tcn-unsaved-modal__triangle" d="M10.9 4.5a1.25 1.25 0 0 1 2.2 0l8 14.2a1.25 1.25 0 0 1-1.1 1.8H4a1.25 1.25 0 0 1-1.1-1.8l8-14.2Z" />
							<path class="tcn-unsaved-modal__mark" d="M12 9v5m0 3.2v.1" />
						</svg>
					</div>
					<h2 id="tcn-unsaved-modal-title">You are leaving without saving changes</h2>
					<p id="tcn-unsaved-modal-message">The course you started has unsaved changes. Would you like to save it before leaving?</p>
					<div class="tcn-modal__actions">
						<button type="button" class="tcn-btn-ghost" id="tcn-unsaved-modal-discard">Discard</button>
						<button type="button" class="tcn-save-btn" id="tcn-unsaved-modal-save">Save</button>
						<button type="button" class="tcn-btn-ghost" id="tcn-unsaved-modal-course-type-close" hidden>Close</button>
					</div>
				</div>
			</div>
		</div>
		<?php
	}

	private static function render_order_options( $selected ) {
		for ( $i = 1; $i <= 100; $i++ ) {
			printf(
				'<option value="%1$d" %2$s>%3$s</option>',
				$i,
				selected( (int) $selected, $i, false ),
				esc_html( sprintf( '%02d', $i ) )
			);
		}
	}

	private static function render_video_source_toggle( $name, $id_prefix, $selected ) {
		self::render_pill_toggle( $name, $id_prefix, array( 'vimeo' => 'Vimeo', 'youtube' => 'YouTube' ), $selected );
	}

	private static function render_tier_toggle( $name, $id_prefix, $selected ) {
		self::render_pill_toggle( $name, $id_prefix, array( 'free' => 'Free', 'paid' => 'Paid' ), $selected );
	}

	private static function render_pill_toggle( $name, $id_prefix, $options, $selected ) {
		?>
		<div class="tcn-pill-toggle">
			<?php foreach ( $options as $value => $label ) :
				$id = $id_prefix . '_' . $value;
			?>
				<input type="radio" id="<?php echo esc_attr( $id ); ?>" name="<?php echo esc_attr( $name ); ?>" value="<?php echo esc_attr( $value ); ?>" <?php checked( $selected, $value ); ?> />
				<label for="<?php echo esc_attr( $id ); ?>"><?php echo esc_html( $label ); ?></label>
			<?php endforeach; ?>
		</div>
		<?php
	}

	private static function render_media_picker( $label, $field_key, $attachment_id, $title, $crop_width = 0, $crop_height = 0 ) {
		TCNexus_Media::render_picker( $label, $field_key, $attachment_id, $title, $crop_width, $crop_height );
	}

	private static function format_tc_lens_time( $seconds ) {
		$seconds = max( 0, absint( $seconds ) );
		return sprintf( '%02d:%02d', floor( $seconds / 60 ), $seconds % 60 );
	}

	private static function render_tc_lens_timeline_field( $field_prefix, $timeline, $template = false ) {
		$timeline = self::sanitize_tc_lens_timeline( $timeline );
		?>
		<section class="tcn-tc-lens-timeline" data-tc-lens-timeline>
			<div class="tcn-tc-lens-timeline__header">
				<div>
					<label class="tcn-field__label">TC Lens timeline</label>
					<p class="tcn-field__hint">Send independent LLM or trade-data messages at selected video times.</p>
				</div>
				<button type="button" class="tcn-btn-ghost tcn-tc-lens-add">+ Add message</button>
			</div>
			<p class="tcn-tc-lens-timeline__error" role="alert" aria-live="polite"></p>
			<div class="tcn-tc-lens-events" data-tc-lens-events>
				<?php foreach ( $timeline as $index => $event ) :
					$event_prefix = $field_prefix . '[tc_lens_timeline][' . $index . ']';
					?>
					<div class="tcn-tc-lens-event" data-tc-lens-event>
						<input type="hidden" name="<?php echo esc_attr( $event_prefix . '[id]' ); ?>" value="<?php echo esc_attr( $event['id'] ); ?>" />
						<div class="tcn-tc-lens-event__type">
							<label class="tcn-field__label">Type</label>
							<small class="tcn-tc-lens-field__help">Choose what TC Lens should receive.</small>
							<select name="<?php echo esc_attr( $event_prefix . '[messageType]' ); ?>" class="tcn-select">
								<option value="llm" <?php selected( $event['messageType'], 'llm' ); ?>>LLM</option>
								<option value="trade" <?php selected( $event['messageType'], 'trade' ); ?>>Trade data</option>
							</select>
						</div>
						<div class="tcn-tc-lens-event__time">
							<label class="tcn-field__label">Start time</label>
							<small class="tcn-tc-lens-field__help">When this message should appear.</small>
							<input type="text" inputmode="numeric" name="<?php echo esc_attr( $event_prefix . '[startTime]' ); ?>" value="<?php echo esc_attr( self::format_tc_lens_time( $event['startTime'] ) ); ?>" placeholder="00:00" />
						</div>
						<div class="tcn-tc-lens-event__time">
							<label class="tcn-field__label">End time <span>(optional)</span></label>
							<small class="tcn-tc-lens-field__help">Optional: when this message should stop.</small>
							<input type="text" inputmode="numeric" name="<?php echo esc_attr( $event_prefix . '[endTime]' ); ?>" value="<?php echo null !== $event['endTime'] ? esc_attr( self::format_tc_lens_time( $event['endTime'] ) ) : ''; ?>" placeholder="00:00" />
						</div>
						<?php self::render_tc_lens_payload_fields( $event_prefix, $event ); ?>
						<button type="button" class="tcn-tc-lens-event__remove" aria-label="Remove TC Lens message" title="Remove TC Lens message"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg></button>
					</div>
				<?php endforeach; ?>
				<?php if ( $template ) : ?>
					<div class="tcn-tc-lens-event tcn-tc-lens-event--template" data-tc-lens-event-template hidden>
						<input type="hidden" disabled name="<?php echo esc_attr( $field_prefix . '[tc_lens_timeline][__TIMELINE_INDEX__][id]' ); ?>" value="" />
						<div class="tcn-tc-lens-event__type">
							<label class="tcn-field__label">Type</label>
							<small class="tcn-tc-lens-field__help">Choose what TC Lens should receive.</small>
							<select disabled name="<?php echo esc_attr( $field_prefix . '[tc_lens_timeline][__TIMELINE_INDEX__][messageType]' ); ?>" class="tcn-select">
								<option value="llm">LLM</option><option value="trade">Trade data</option>
							</select>
						</div>
						<div class="tcn-tc-lens-event__time"><label class="tcn-field__label">Start time</label><small class="tcn-tc-lens-field__help">When this message should appear.</small><input disabled type="text" inputmode="numeric" name="<?php echo esc_attr( $field_prefix . '[tc_lens_timeline][__TIMELINE_INDEX__][startTime]' ); ?>" value="" placeholder="00:00" /></div>
						<div class="tcn-tc-lens-event__time"><label class="tcn-field__label">End time <span>(optional)</span></label><small class="tcn-tc-lens-field__help">Optional: when this message should stop.</small><input disabled type="text" inputmode="numeric" name="<?php echo esc_attr( $field_prefix . '[tc_lens_timeline][__TIMELINE_INDEX__][endTime]' ); ?>" value="" placeholder="00:00" /></div>
						<?php self::render_tc_lens_payload_fields( $field_prefix . '[tc_lens_timeline][__TIMELINE_INDEX__]', array(), true ); ?>
						<button type="button" class="tcn-tc-lens-event__remove" aria-label="Remove TC Lens message" title="Remove TC Lens message"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg></button>
					</div>
				<?php endif; ?>
			</div>
		</section>
		<?php
	}

	private static function render_tc_lens_payload_fields( $event_prefix, $event = array(), $disabled = false ) {
		$payload = array( 'trade' => array(), 'llm' => array() );
		$trade = isset( $event['trade'] ) && is_array( $event['trade'] ) ? $event['trade'] : array();
		$llm   = isset( $event['llm'] ) && is_array( $event['llm'] ) ? $event['llm'] : array();
		if ( empty( $trade ) && ! empty( $event['message'] ) ) {
			$trade['assumptions'] = $event['message'];
		}
		if ( empty( $llm ) && ! empty( $event['message'] ) ) {
			$llm['question'] = $event['message'];
		}
		$attr  = $disabled ? ' disabled' : '';
		?>
		<div class="tcn-tc-lens-payload" data-tc-lens-payload>
			<div class="tcn-tc-lens-payload__trade" data-tc-lens-payload-panel="trade">
				<div class="tcn-tc-lens-event__field"><label class="tcn-field__label">Underlying</label><small class="tcn-tc-lens-field__help">Ticker or asset used in the example.</small><input<?php echo $attr; ?> type="text" name="<?php echo esc_attr( $event_prefix . '[trade][underlying]' ); ?>" value="<?php echo esc_attr( $trade['underlying'] ?? '' ); ?>" placeholder="SPY" /></div>
				<div class="tcn-tc-lens-event__field"><label class="tcn-field__label">Strategy</label><small class="tcn-tc-lens-field__help">Name the trade or options strategy.</small><input<?php echo $attr; ?> type="text" name="<?php echo esc_attr( $event_prefix . '[trade][strategy]' ); ?>" value="<?php echo esc_attr( $trade['strategy'] ?? '' ); ?>" placeholder="Long Call" /></div>
				<div class="tcn-tc-lens-event__field"><label class="tcn-field__label">Strikes</label><small class="tcn-tc-lens-field__help">Strike prices used by the trade.</small><input<?php echo $attr; ?> type="text" name="<?php echo esc_attr( $event_prefix . '[trade][strikes]' ); ?>" value="<?php echo esc_attr( implode( ', ', (array) ( $trade['strikes'] ?? array() ) ) ); ?>" placeholder="500, 510" /></div>
				<div class="tcn-tc-lens-event__field"><label class="tcn-field__label">Expiration</label><small class="tcn-tc-lens-field__help">Expiration date for the position.</small><input<?php echo $attr; ?> type="text" name="<?php echo esc_attr( $event_prefix . '[trade][expiration]' ); ?>" value="<?php echo esc_attr( $trade['expiration'] ?? '' ); ?>" placeholder="2026-12-18" /></div>
				<div class="tcn-tc-lens-event__field"><label class="tcn-field__label">Quantity</label><small class="tcn-tc-lens-field__help">Number of contracts or units.</small><input<?php echo $attr; ?> type="number" min="0" step="any" name="<?php echo esc_attr( $event_prefix . '[trade][quantity]' ); ?>" value="<?php echo esc_attr( $trade['quantity'] ?? '' ); ?>" /></div>
				<div class="tcn-tc-lens-event__field"><label class="tcn-field__label">Entry price</label><small class="tcn-tc-lens-field__help">Price paid when the trade starts.</small><input<?php echo $attr; ?> type="number" min="0" step="any" name="<?php echo esc_attr( $event_prefix . '[trade][entryPrice]' ); ?>" value="<?php echo esc_attr( $trade['entryPrice'] ?? '' ); ?>" /></div>
				<div class="tcn-tc-lens-event__field tcn-tc-lens-event__field--wide"><label class="tcn-field__label">Legs</label><small class="tcn-tc-lens-field__help">Add one trade leg per line.</small><textarea<?php echo $attr; ?> name="<?php echo esc_attr( $event_prefix . '[trade][legs]' ); ?>" rows="2" placeholder="One leg per line: buy | call | 1 | 500 | 2026-12-18"><?php echo esc_textarea( self::format_tc_lens_legs( $trade['legs'] ?? array() ) ); ?></textarea></div>
				<div class="tcn-tc-lens-event__field tcn-tc-lens-event__field--wide"><label class="tcn-field__label">Lesson assumptions</label><small class="tcn-tc-lens-field__help">Context TC Lens should use for the calculation.</small><textarea<?php echo $attr; ?> name="<?php echo esc_attr( $event_prefix . '[trade][assumptions]' ); ?>" rows="2" placeholder="Learning and recalculation assumptions"><?php echo esc_textarea( $trade['assumptions'] ?? '' ); ?></textarea></div>
			</div>
			<div class="tcn-tc-lens-payload__llm" data-tc-lens-payload-panel="llm">
				<div class="tcn-tc-lens-event__field tcn-tc-lens-event__field--wide"><label class="tcn-field__label">Prepared question</label><small class="tcn-tc-lens-field__help">Question TC Lens should answer.</small><textarea<?php echo $attr; ?> name="<?php echo esc_attr( $event_prefix . '[llm][question]' ); ?>" rows="2" placeholder="Question to send to the LLM"><?php echo esc_textarea( $llm['question'] ?? '' ); ?></textarea></div>
				<div class="tcn-tc-lens-event__field tcn-tc-lens-event__field--wide"><label class="tcn-field__label">Scene context</label><small class="tcn-tc-lens-field__help">What is happening in the video here.</small><textarea<?php echo $attr; ?> name="<?php echo esc_attr( $event_prefix . '[llm][sceneContext]' ); ?>" rows="2" placeholder="What is happening in the video at this moment?"><?php echo esc_textarea( $llm['sceneContext'] ?? '' ); ?></textarea></div>
				<div class="tcn-tc-lens-event__field"><label class="tcn-field__label">Learning level</label><small class="tcn-tc-lens-field__help">Sets the depth of the LLM explanation.</small><select<?php echo $attr; ?> name="<?php echo esc_attr( $event_prefix . '[llm][learningLevel]' ); ?>" class="tcn-select"><option value="beginner" <?php selected( $llm['learningLevel'] ?? 'beginner', 'beginner' ); ?>>Beginner</option><option value="intermediate" <?php selected( $llm['learningLevel'] ?? '', 'intermediate' ); ?>>Intermediate</option><option value="advanced" <?php selected( $llm['learningLevel'] ?? '', 'advanced' ); ?>>Advanced</option><option value="expert" <?php selected( $llm['learningLevel'] ?? '', 'expert' ); ?>>Expert</option></select></div>
			</div>
		</div>
		<?php
	}

	private static function format_tc_lens_legs( $legs ) {
		$lines = array();
		foreach ( (array) $legs as $leg ) {
			if ( ! is_array( $leg ) ) {
				continue;
			}
			$lines[] = implode( ' | ', array( $leg['action'] ?? '', $leg['side'] ?? '', $leg['quantity'] ?? '', $leg['strike'] ?? '', $leg['expiration'] ?? '' ) );
		}
		return implode( "\n", $lines );
	}

	/**
	 * Instructor and Guest fields use the shared quick-create modal. Episode
	 * fields reuse the same UI for Characters when this builder is in Show mode.
	 */
	private static function render_person_field( $label, $field_name, $people, $selected_id, $role ) {
		?>
		<div class="tcn-field">
			<label class="tcn-field__label"><?php echo esc_html( $label ); ?></label>
			<div class="tcn-person-field">
				<select name="<?php echo esc_attr( $field_name ); ?>" class="tcn-select">
					<option value="">— None —</option>
					<?php foreach ( $people as $person ) : ?>
						<option value="<?php echo esc_attr( $person->ID ); ?>" <?php selected( $selected_id, $person->ID ); ?>><?php echo esc_html( $person->post_title ); ?></option>
					<?php endforeach; ?>
				</select>
				<button type="button" class="tcn-btn-ghost tcn-add-person" data-target-select="<?php echo esc_attr( $field_name ); ?>" data-role="<?php echo esc_attr( $role ); ?>" aria-label="Add new <?php echo esc_attr( $role ); ?>">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
				</button>
			</div>
		</div>
		<?php
	}

	private static function render_instructor_field( $field_name, $selected_ids, $people, $level_slug ) {
		$selected_ids = array_values( array_unique( array_filter( array_map( 'absint', (array) $selected_ids ) ) ) );
		?>
		<div class="tcn-lesson-card__guests tcn-course-instructors">
			<label class="tcn-field__label" for="instructors_<?php echo esc_attr( $level_slug ); ?>">Instructors for this course</label>
			<div class="tcn-lesson-person-picker">
				<select id="instructors_<?php echo esc_attr( $level_slug ); ?>" class="tcn-select tcn-course-instructor-picker" data-instructor-picker="1" data-person-input-name="<?php echo esc_attr( $field_name ); ?>">
					<option value="">Select an instructor…</option>
					<?php foreach ( $people as $person ) : ?><option value="<?php echo esc_attr( $person->ID ); ?>" data-photo="<?php echo esc_url( get_the_post_thumbnail_url( $person->ID, 'thumbnail' ) ?: '' ); ?>"><?php echo esc_html( $person->post_title ); ?></option><?php endforeach; ?>
				</select>
			</div>
			<p class="tcn-field__hint">Selected instructors from the dropdown will be added below.</p>
			<div class="tcn-lesson-guest-list tcn-course-instructor-list">
				<?php foreach ( $selected_ids as $person_id ) : $person = get_post( $person_id ); if ( ! $person ) { continue; } ?>
					<div class="tcn-lesson-guest" data-instructor-id="<?php echo esc_attr( $person_id ); ?>">
						<?php $person_photo = get_the_post_thumbnail_url( $person->ID, 'thumbnail' ); ?>
						<?php if ( $person_photo ) : ?><img class="tcn-lesson-guest__avatar" src="<?php echo esc_url( $person_photo ); ?>" alt="" /><?php endif; ?>
						<span class="tcn-lesson-guest__name"><?php echo esc_html( $person->post_title ); ?></span>
						<input type="hidden" name="<?php echo esc_attr( $field_name ); ?>" value="<?php echo esc_attr( $person_id ); ?>" />
						<button type="button" class="tcn-lesson-guest__remove" aria-label="Remove <?php echo esc_attr( $person->post_title ); ?>">×</button>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
		<?php
	}

	public static function render_lesson_guest_field( $field_name, $selected_ids, $people, $lesson_label = 'Episode', $person_kind = 'guest' ) {
		$selected_ids = array_values( array_map( 'absint', (array) $selected_ids ) );
		$is_character = 'character' === $person_kind;
		$person_label = $is_character ? 'Character' : 'Guest';
		?>
		<div class="tcn-lesson-card__guests">
			<label class="tcn-field__label"><?php echo esc_html( $is_character ? 'Characters' : 'Guest(s)' ); ?> for this <?php echo esc_html( $lesson_label ); ?></label>
			<div class="tcn-lesson-person-picker">
			<select name="<?php echo esc_attr( $field_name ); ?>" class="tcn-select tcn-lesson-guest-picker" data-person-kind="<?php echo esc_attr( $person_kind ); ?>" data-person-input-name="<?php echo esc_attr( $field_name ); ?>">
				<option value="">Select a <?php echo esc_attr( strtolower( $person_label ) ); ?>…</option>
				<?php foreach ( $people as $person ) : ?>
					<option value="<?php echo esc_attr( $person->ID ); ?>" data-photo="<?php echo esc_url( get_the_post_thumbnail_url( $person->ID, 'thumbnail' ) ?: '' ); ?>"><?php echo esc_html( $person->post_title ); ?></option>
				<?php endforeach; ?>
			</select>
			<?php if ( $is_character ) : ?>
				<button type="button" class="tcn-btn-ghost tcn-add-person tcn-lesson-person-add" data-target-select="<?php echo esc_attr( $field_name ); ?>" data-role="character" aria-label="Add new character">+</button>
			<?php endif; ?>
			</div>
			<p class="tcn-field__hint">Selected <?php echo esc_html( $is_character ? 'characters' : 'guest(s)' ); ?> from the dropdown will be added below.</p>
			<div class="tcn-lesson-guest-list">
				<?php foreach ( $selected_ids as $person_id ) : $person = get_post( $person_id ); if ( ! $person || ( $is_character ? 'tc_character' !== $person->post_type : 'guest' !== TCNexus_Post_Types::get_person_role( $person_id ) ) ) { continue; } ?>
					<div class="tcn-lesson-guest" data-guest-id="<?php echo esc_attr( $person_id ); ?>">
						<?php $person_photo = get_the_post_thumbnail_url( $person->ID, 'thumbnail' ); ?>
						<?php if ( $person_photo ) : ?><img class="tcn-lesson-guest__avatar" src="<?php echo esc_url( $person_photo ); ?>" alt="" /><?php endif; ?>
						<span class="tcn-lesson-guest__name"><?php echo esc_html( $person->post_title ); ?></span>
						<input type="hidden" name="<?php echo esc_attr( $field_name ); ?>" value="<?php echo esc_attr( $person_id ); ?>" />
						<button type="button" class="tcn-lesson-guest__remove" aria-label="Remove <?php echo esc_attr( $person->post_title ); ?>">×</button>
					</div>
				<?php endforeach; ?>
			</div>
		</div>
		<?php
	}

	public static function handle_save() {
		if ( ! isset( $_POST['tcnexus_course_builder_nonce'] ) ||
			! wp_verify_nonce( $_POST['tcnexus_course_builder_nonce'], 'tcnexus_course_builder' ) ) {
			wp_die( 'Invalid request.' );
		}

		$course_id = isset( $_POST['course_id'] ) ? absint( $_POST['course_id'] ) : 0;
		if ( ! $course_id || ! current_user_can( 'edit_post', $course_id ) || self::content_type() !== get_post_type( $course_id ) ) {
			wp_die( 'Invalid ' . strtolower( self::content_label() ) . '.' );
		}

		$status = isset( $_POST['course_status'] ) && 'publish' === $_POST['course_status'] ? 'publish' : 'draft';
		$slug   = isset( $_POST['course_slug'] ) ? sanitize_title( wp_unslash( $_POST['course_slug'] ) ) : '';
		$active_language = isset( $_POST['active_language'] ) && array_key_exists( sanitize_key( $_POST['active_language'] ), self::LANGUAGES ) ? sanitize_key( $_POST['active_language'] ) : 'en';
		$levels = self::sanitize_course_levels( wp_unslash( $_POST['levels'] ?? array() ) );
		$is_show = self::is_show_mode();
		$new_season = $is_show && ! empty( $_POST['new_season'] );
		$return_level = sanitize_key( $_POST['active_level'] ?? ( $is_show ? 'season-1' : 'beginner' ) );
		if ( $new_season ) {
			$season_numbers = array_map( function ( $key ) { return (int) substr( $key, 7 ); }, array_filter( array_keys( $levels ), function ( $key ) { return (bool) preg_match( '/^season-\d+$/', $key ); } ) );
			$next_season = 'season-' . ( ( $season_numbers ? max( $season_numbers ) : 0 ) + 1 );
			$levels[ $next_season ] = self::empty_level( $next_season );
			$levels[ $next_season ]['enabled'] = true;
			$return_level = $next_season;
		}
		$languages = self::get_course_languages( $course_id );
		$remove_language = isset( $_POST['remove_language'] ) ? sanitize_key( $_POST['remove_language'] ) : '';
		$new_language = isset( $_POST['new_language'] ) ? sanitize_key( $_POST['new_language'] ) : '';
		$is_new_course = ! empty( $_POST['new_course'] );
		if ( $is_new_course && $new_language && array_key_exists( $new_language, self::LANGUAGES ) ) {
			$languages = array();
			$active_language = $new_language;
		}
		if ( $new_language && array_key_exists( $new_language, self::LANGUAGES ) && ! isset( $languages[ $new_language ] ) ) {
			$empty_levels = array();
			if ( $is_show ) {
				$empty_levels['season-1'] = self::empty_level( 'season-1' );
				$empty_levels['season-1']['enabled'] = true;
			} else {
				foreach ( self::LEVELS as $new_level_slug => $new_level_label ) {
					$empty_levels[ $new_level_slug ] = self::empty_level( $new_level_slug );
				}
			}
			$languages[ $new_language ] = array(
				'label'  => self::LANGUAGES[ $new_language ],
				'levels' => $empty_levels,
			);
		}
		$removing_active_language = $remove_language && $remove_language === $active_language;
		if ( $remove_language && 'en' !== $remove_language ) {
			unset( $languages[ $remove_language ] );
		}
		if ( ! $removing_active_language ) {
			$languages[ $active_language ] = array(
				'label'  => self::LANGUAGES[ $active_language ],
				'levels' => $levels,
			);
		} else {
			$active_language = 'en';
		}
		$primary_level_slug = $is_show ? 'season-1' : 'beginner';
		if ( ! isset( $levels[ $primary_level_slug ] ) ) {
			$levels[ $primary_level_slug ] = self::empty_level( $primary_level_slug );
		}
		$base_title = $levels[ $primary_level_slug ]['title'] ?: sanitize_text_field( wp_unslash( $_POST['course_title'] ?? '' ) );
		$base_slug  = $levels[ $primary_level_slug ]['course_slug'] ?: $slug;
		$levels[ $primary_level_slug ]['title'] = $base_title;
		if ( $is_show ) {
			$slug = get_post_field( 'post_name', $course_id );
		} else {
			$base_slug = self::slug_base( $base_slug );
			$levels['beginner']['course_slug'] = self::level_slug( $active_language, $base_slug, 'beginner' );
			$slug = $levels['beginner']['course_slug'];
			foreach ( array( 'intermediate', 'advanced' ) as $level_slug ) {
				if ( '' === $levels[ $level_slug ]['title'] ) {
					$levels[ $level_slug ]['title'] = $base_title . ' - ' . self::LEVELS[ $level_slug ];
				}
				$levels[ $level_slug ]['course_slug'] = self::level_slug( $active_language, $base_slug, $level_slug );
			}
		}
		if ( ! $removing_active_language ) {
			$languages[ $active_language ]['levels'] = $levels;
		}
		$language_keys = array_keys( $languages );
		$primary_language = isset( $languages['en'] ) ? 'en' : ( $language_keys[0] ?? 'en' );
		$english_levels = isset( $languages[ $primary_language ]['levels'] ) ? $languages[ $primary_language ]['levels'] : $levels;
		$primary_level_slug = $is_show ? 'season-1' : 'beginner';
		$beginner_level = $english_levels[ $primary_level_slug ] ?? reset( $english_levels );
		$slug = $is_show ? get_post_field( 'post_name', $course_id ) : ( $beginner_level['course_slug'] ?: get_post_field( 'post_name', $course_id ) );

		$update = array(
			'ID'           => $course_id,
			'post_title'   => $beginner_level['title'] ?: get_the_title( $course_id ),
			'post_content' => $beginner_level['content'] ?: wp_kses_post( wp_unslash( $_POST['course_content'] ?? '' ) ),
			'post_status'  => $status,
		);
		if ( '' !== $slug ) {
			$update['post_name'] = $slug;
		}
		if ( ! empty( $_POST['course_author'] ) ) {
			$update['post_author'] = absint( $_POST['course_author'] );
		}
		wp_update_post( $update );
		update_post_meta( $course_id, self::LANGUAGE_META_KEY, $languages );
		update_post_meta( $course_id, self::LEVEL_META_KEY, $english_levels );
		if ( $remove_language && 'en' !== $remove_language ) {
			$removed_lessons = get_posts( array(
				'post_type'      => 'tc_lesson',
				'posts_per_page' => -1,
				'post_status'    => array( 'publish', 'draft' ),
				'fields'         => 'ids',
				'meta_key'       => '_tcnexus_course_id',
				'meta_value'     => $course_id,
			) );
			foreach ( $removed_lessons as $removed_lesson_id ) {
				if ( ( get_post_meta( $removed_lesson_id, self::LANGUAGE_LESSON_META_KEY, true ) ?: 'en' ) === $remove_language ) {
					wp_trash_post( $removed_lesson_id );
				}
			}
		}
		wp_set_post_terms( $course_id, self::is_show_mode() ? array( self::SHOW_CATEGORY ) : $beginner_level['course_types'], 'course_type', false );
		update_post_meta( $course_id, '_tcnexus_course_level', $primary_level_slug );
		update_post_meta( $course_id, '_tcnexus_course_language', $primary_language );
		update_post_meta( $course_id, '_tcnexus_image_desktop_id', $beginner_level['image_desktop_id'] );
		update_post_meta( $course_id, '_tcnexus_image_mobile_id', $beginner_level['image_mobile_id'] );
		update_post_meta( $course_id, '_tcnexus_landing_background_id', $beginner_level['landing_background_id'] );
		update_post_meta( $course_id, '_tcnexus_title_image_id', $beginner_level['title_image_id'] );
		if ( $beginner_level['thumbnail_desktop_id'] ) {
			set_post_thumbnail( $course_id, $beginner_level['thumbnail_desktop_id'] );
		} else {
			delete_post_thumbnail( $course_id );
		}
		update_post_meta( $course_id, '_tcnexus_thumbnail_mobile_id', $beginner_level['thumbnail_mobile_id'] );
		$beginner_instructor_ids = array_values( array_unique( array_filter( array_map( 'absint', (array) ( $beginner_level['instructor_ids'] ?? array( $beginner_level['instructor_id'] ?? 0 ) ) ) ) ) );
		update_post_meta( $course_id, '_tcnexus_instructor_ids', $beginner_instructor_ids );
		update_post_meta( $course_id, '_tcnexus_instructor_id', $beginner_instructor_ids[0] ?? 0 );
		if ( self::is_show_mode() ) {
			update_post_meta( $course_id, self::SHOW_CHARACTERS_META_KEY, array_values( array_filter( array_map( 'absint', (array) ( $beginner_level['character_ids'] ?? array() ) ) ) ) );
		}
		update_post_meta( $course_id, '_tcnexus_overview_link', $beginner_level['overview_link'] );
		update_post_meta( $course_id, '_tcnexus_trailer_link', $beginner_level['trailer_link'] );

		$posted_levels = is_array( $_POST['levels'] ?? null ) ? wp_unslash( $_POST['levels'] ) : array();
		$save_level_keys = $is_show ? array_keys( $levels ) : array_keys( self::LEVELS );
		foreach ( $save_level_keys as $level_slug ) {
			$level_post = isset( $posted_levels[ $level_slug ] ) && is_array( $posted_levels[ $level_slug ] ) ? $posted_levels[ $level_slug ] : array();
			$existing_lessons = isset( $level_post['lessons']['existing'] ) && is_array( $level_post['lessons']['existing'] ) ? $level_post['lessons']['existing'] : array();
			foreach ( $existing_lessons as $lesson_id => $data ) {
				$lesson_id = absint( $lesson_id );
				if ( ! $lesson_id || ! current_user_can( 'edit_post', $lesson_id ) || (int) get_post_meta( $lesson_id, '_tcnexus_course_id', true ) !== $course_id ) {
					continue;
				}
				if ( ! empty( $data['delete'] ) ) {
					wp_trash_post( $lesson_id );
					continue;
				}
				self::persist_lesson_fields( $lesson_id, $data );
				update_post_meta( $lesson_id, '_tcnexus_course_id', $course_id );
				update_post_meta( $lesson_id, self::LEVEL_LESSON_META_KEY, $level_slug );
				update_post_meta( $lesson_id, self::LANGUAGE_LESSON_META_KEY, $active_language );
			}

			$new_lessons = isset( $level_post['lessons']['new'] ) && is_array( $level_post['lessons']['new'] ) ? $level_post['lessons']['new'] : array();
			foreach ( $new_lessons as $data ) {
				$title = trim( sanitize_text_field( wp_unslash( $data['title'] ?? '' ) ) );
				if ( '' === $title ) {
					continue; // Skip untouched template rows.
				}

				$new_id = wp_insert_post( array(
					'post_type'    => 'tc_lesson',
					'post_title'   => $title,
					'post_content' => wp_kses_post( wp_unslash( $data['description'] ?? '' ) ),
					'post_status'  => 'publish',
					'menu_order'   => isset( $data['order'] ) ? absint( $data['order'] ) : 0,
				) );

				if ( ! is_wp_error( $new_id ) ) {
					update_post_meta( $new_id, '_tcnexus_course_id', $course_id );
				update_post_meta( $new_id, self::LEVEL_LESSON_META_KEY, $level_slug );
				update_post_meta( $new_id, self::LANGUAGE_LESSON_META_KEY, $active_language );
					update_post_meta( $new_id, '_tcnexus_vimeo_id', sanitize_text_field( wp_unslash( $data['vimeo_id'] ?? '' ) ) );
					update_post_meta( $new_id, '_tcnexus_video_source', self::sanitize_video_source( $data['video_source'] ?? 'vimeo' ) );
					update_post_meta( $new_id, '_tcnexus_duration', sanitize_text_field( wp_unslash( $data['duration'] ?? '' ) ) );
					self::update_lesson_tc_lens_timeline( $new_id, $data['tc_lens_timeline'] ?? array() );
					TCNexus_Post_Types::set_lesson_tier( $new_id, sanitize_key( $data['tier'] ?? 'free' ) );
					if ( self::is_show_mode() ) {
						update_post_meta( $new_id, self::LESSON_CHARACTERS_META_KEY, self::sanitize_lesson_character_ids( $data['character_ids'] ?? array() ) );
					} else {
						update_post_meta( $new_id, self::LESSON_GUESTS_META_KEY, self::sanitize_lesson_guest_ids( $data['guest_ids'] ?? array() ) );
					}
					if ( ! empty( $data['thumbnail_id'] ) ) {
						set_post_thumbnail( $new_id, absint( $data['thumbnail_id'] ) );
					}
				}
			}
		}
		if ( ! $is_show ) {
			self::migrate_legacy_course_guest_to_first_lesson( $course_id, $english_levels );
		}

		$return_tab = isset( $_POST['active_tab'] ) && in_array( sanitize_key( $_POST['active_tab'] ), array( 'basics', 'media', 'people', 'links' ), true ) ? sanitize_key( $_POST['active_tab'] ) : 'basics';
		$return_level = isset( $levels[ $return_level ] ) ? $return_level : ( $is_show ? 'season-1' : 'beginner' );
		$redirect_parameter = $is_show ? 'season' : 'level';
		$redirect = admin_url( 'admin.php?page=' . self::builder_page() . '&course_id=' . $course_id . '&language=' . rawurlencode( $new_language ?: $active_language ) . '&' . $redirect_parameter . '=' . rawurlencode( $return_level ) . '&tab=' . rawurlencode( $return_tab ) . '&saved=1' );
		if ( $is_new_course ) {
			$redirect .= '&new=1';
		}

		// "Save Lesson & Add New" (see the Lessons card's own Save buttons)
		// has a blank row waiting after the reload — see the
		// data-add-lesson-row handling in course-builder.js.
		$lesson_action = isset( $_POST['lesson_action'] ) ? sanitize_key( $_POST['lesson_action'] ) : '';
		if ( 'save_add_new' === $lesson_action ) {
			$active_level = $return_level;
			$redirect .= '&add_row=1&' . $redirect_parameter . '=' . rawurlencode( $active_level );
		}
		TCNexus_Media_Library::assign_posted_media( wp_unslash( $_POST ), self::is_show_mode() ? 'show' : 'course', $course_id );

		wp_safe_redirect( $redirect );
		exit;
	}

	private static function sanitize_video_source( $source ) {
		$source = sanitize_key( $source );
		return in_array( $source, array( 'vimeo', 'youtube' ), true ) ? $source : 'vimeo';
	}

	/**
	 * Normalize one timeline time value to seconds.
	 *
	 * The admin normally submits seconds, but accepting mm:ss here keeps the
	 * storage boundary defensive for alternate editors and direct requests.
	 */
	private static function normalize_tc_lens_time( $value, $allow_null = false ) {
		if ( $allow_null && ( null === $value || '' === trim( (string) $value ) ) ) {
			return null;
		}

		if ( is_string( $value ) && preg_match( '/^(\d+):(\d{1,2})$/', trim( $value ), $matches ) ) {
			$minutes = absint( $matches[1] );
			$seconds = absint( $matches[2] );
			if ( $seconds > 59 ) {
				return null;
			}
			return ( $minutes * 60 ) + $seconds;
		}

		if ( is_int( $value ) || ( is_string( $value ) && preg_match( '/^\d+$/', trim( $value ) ) ) ) {
			return absint( $value );
		}

		return null;
	}

	/**
	 * Sanitize and normalize the repeatable TC Lens timeline rows.
	 */
	public static function sanitize_tc_lens_timeline( $timeline ) {
		if ( is_string( $timeline ) ) {
			$decoded = json_decode( $timeline, true );
			$timeline = is_array( $decoded ) ? $decoded : array();
		}
		$timeline = is_array( $timeline ) ? $timeline : array();
		$normalized = array();

		foreach ( $timeline as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			$message_type = sanitize_key( $row['messageType'] ?? $row['message_type'] ?? '' );
			$message      = is_scalar( $row['message'] ?? null ) ? sanitize_textarea_field( wp_unslash( (string) $row['message'] ) ) : '';
			$trade        = is_array( $row['trade'] ?? null ) ? $row['trade'] : array();
			$llm          = is_array( $row['llm'] ?? null ) ? $row['llm'] : array();
			$trade_data   = self::sanitize_tc_lens_trade_data( $trade, $message );
			$llm_data     = self::sanitize_tc_lens_llm_data( $llm, $message );
			$start_time   = self::normalize_tc_lens_time( $row['startTime'] ?? $row['start_time'] ?? null );
			$raw_end_time = $row['endTime'] ?? $row['end_time'] ?? null;
			$end_is_blank = null === $raw_end_time || ( is_scalar( $raw_end_time ) && '' === trim( (string) $raw_end_time ) );
			$end_time     = self::normalize_tc_lens_time( $raw_end_time, true );

			$has_payload = 'trade' === $message_type
				? ( '' !== $trade_data['underlying'] || '' !== $trade_data['strategy'] || ! empty( $trade_data['legs'] ) || '' !== $trade_data['assumptions'] || '' !== $message )
				: ( '' !== $llm_data['question'] || '' !== $llm_data['sceneContext'] || '' !== $message );
			if ( ! in_array( $message_type, array( 'llm', 'trade' ), true ) || ! $has_payload || null === $start_time || ( ! $end_is_blank && null === $end_time ) ) {
				continue;
			}
			if ( null !== $end_time && $end_time < $start_time ) {
				continue;
			}

			$row_id = sanitize_key( $row['id'] ?? '' );
			if ( '' === $row_id ) {
				$row_id = 'event-' . wp_generate_uuid4();
			}

			$normalized[] = array(
				'id'          => $row_id,
				'messageType' => $message_type,
				'message'     => $message,
				'startTime'   => $start_time,
				'endTime'     => $end_time,
				'trade'       => $trade_data,
				'llm'         => $llm_data,
				'data'        => 'trade' === $message_type ? $trade_data : $llm_data,
			);
		}

		return $normalized;
	}

	private static function sanitize_tc_lens_trade_data( $trade, $legacy_message = '' ) {
		$legs = array();
		$raw_legs = $trade['legs'] ?? array();
		if ( is_string( $raw_legs ) ) {
			$raw_legs = preg_split( '/\r\n|\r|\n/', $raw_legs );
		}
		foreach ( (array) $raw_legs as $leg ) {
			if ( is_string( $leg ) ) {
				$parts = array_map( 'trim', explode( '|', $leg ) );
				$leg = array(
					'action'     => $parts[0] ?? '',
					'side'       => $parts[1] ?? '',
					'quantity'   => $parts[2] ?? '',
					'strike'     => $parts[3] ?? '',
					'expiration' => $parts[4] ?? '',
				);
			}
			if ( ! is_array( $leg ) ) {
				continue;
			}
			$legs[] = array(
				'action'      => sanitize_text_field( wp_unslash( (string) ( $leg['action'] ?? '' ) ) ),
				'side'        => sanitize_text_field( wp_unslash( (string) ( $leg['side'] ?? '' ) ) ),
				'quantity'    => max( 0, (float) ( $leg['quantity'] ?? 0 ) ),
				'strike'      => sanitize_text_field( wp_unslash( (string) ( $leg['strike'] ?? '' ) ) ),
				'expiration'  => sanitize_text_field( wp_unslash( (string) ( $leg['expiration'] ?? '' ) ) ),
				'entryPrice'  => '' === (string) ( $leg['entryPrice'] ?? '' ) ? null : (float) $leg['entryPrice'],
			);
		}

		$raw_strikes = $trade['strikes'] ?? array();
		if ( is_string( $raw_strikes ) ) {
			$raw_strikes = explode( ',', $raw_strikes );
		}

		return array(
			'underlying' => sanitize_text_field( wp_unslash( (string) ( $trade['underlying'] ?? '' ) ) ),
			'strategy'   => sanitize_text_field( wp_unslash( (string) ( $trade['strategy'] ?? '' ) ) ),
			'legs'       => $legs,
			'strikes'    => array_values( array_filter( array_map( function ( $strike ) { return sanitize_text_field( wp_unslash( (string) $strike ) ); }, (array) $raw_strikes ) ) ),
			'expiration' => sanitize_text_field( wp_unslash( (string) ( $trade['expiration'] ?? '' ) ) ) ?: null,
			'quantity'   => '' === (string) ( $trade['quantity'] ?? '' ) ? null : max( 0, (float) $trade['quantity'] ),
			'entryPrice' => '' === (string) ( $trade['entryPrice'] ?? '' ) ? null : (float) $trade['entryPrice'],
			'assumptions' => sanitize_textarea_field( wp_unslash( (string) ( $trade['assumptions'] ?? $legacy_message ) ) ),
		);
	}

	private static function sanitize_tc_lens_llm_data( $llm, $legacy_message = '' ) {
		return array(
			'question'     => sanitize_textarea_field( wp_unslash( (string) ( $llm['question'] ?? $legacy_message ) ) ),
			'sceneContext' => sanitize_textarea_field( wp_unslash( (string) ( $llm['sceneContext'] ?? '' ) ) ),
			'learningLevel' => sanitize_key( $llm['learningLevel'] ?? 'beginner' ) ?: 'beginner',
		);
	}

	/**
	 * Return the normalized timeline stored on a lesson.
	 */
	public static function get_lesson_tc_lens_timeline( $lesson_id ) {
		$stored = get_post_meta( $lesson_id, self::LESSON_TC_LENS_TIMELINE_META_KEY, true );
		if ( is_string( $stored ) ) {
			$stored = json_decode( $stored, true );
		}
		return self::sanitize_tc_lens_timeline( $stored );
	}

	/**
	 * Persist the normalized timeline JSON for a lesson.
	 */
	public static function update_lesson_tc_lens_timeline( $lesson_id, $timeline ) {
		$normalized = self::sanitize_tc_lens_timeline( $timeline );
		update_post_meta( $lesson_id, self::LESSON_TC_LENS_TIMELINE_META_KEY, wp_json_encode( $normalized ) );
		return $normalized;
	}

	/**
	 * Saves an existing lesson's editable fields (everything except which
	 * course it belongs to). Shared by this class's own form-based save
	 * above and by TCNexus_Global_Lessons's per-row AJAX save, so both
	 * surfaces persist a lesson the exact same way.
	 */
	public static function persist_lesson_fields( $lesson_id, array $data ) {
		wp_update_post( array(
			'ID'           => $lesson_id,
			'post_title'   => sanitize_text_field( wp_unslash( $data['title'] ?? '' ) ),
			'post_content' => wp_kses_post( wp_unslash( $data['description'] ?? '' ) ),
			'menu_order'   => isset( $data['order'] ) ? absint( $data['order'] ) : 0,
		) );
		update_post_meta( $lesson_id, '_tcnexus_vimeo_id', sanitize_text_field( wp_unslash( $data['vimeo_id'] ?? '' ) ) );
		update_post_meta( $lesson_id, '_tcnexus_video_source', self::sanitize_video_source( $data['video_source'] ?? 'vimeo' ) );
		update_post_meta( $lesson_id, '_tcnexus_duration', sanitize_text_field( wp_unslash( $data['duration'] ?? '' ) ) );
		self::update_lesson_tc_lens_timeline( $lesson_id, $data['tc_lens_timeline'] ?? array() );
		TCNexus_Post_Types::set_lesson_tier( $lesson_id, sanitize_key( $data['tier'] ?? 'free' ) );
		if ( self::lesson_uses_characters( $lesson_id ) && array_key_exists( 'character_ids', $data ) ) {
			update_post_meta( $lesson_id, self::LESSON_CHARACTERS_META_KEY, self::sanitize_lesson_character_ids( $data['character_ids'] ) );
		} elseif ( array_key_exists( 'guest_ids', $data ) ) {
			update_post_meta( $lesson_id, self::LESSON_GUESTS_META_KEY, self::sanitize_lesson_guest_ids( $data['guest_ids'] ) );
		}
		if ( ! empty( $data['thumbnail_id'] ) ) {
			set_post_thumbnail( $lesson_id, absint( $data['thumbnail_id'] ) );
		} else {
			delete_post_thumbnail( $lesson_id );
		}
	}

	private static function sanitize_lesson_guest_ids( $ids ) {
		$ids = array_values( array_unique( array_filter( array_map( 'absint', (array) $ids ) ) ) );
		return array_values( array_filter( $ids, function ( $id ) {
			return 'guest' === TCNexus_Post_Types::get_person_role( $id );
		} ) );
	}

	private static function sanitize_lesson_character_ids( $ids ) {
		$ids = array_values( array_unique( array_filter( array_map( 'absint', (array) $ids ) ) ) );
		return array_values( array_filter( $ids, function ( $id ) {
			return 'tc_character' === get_post_type( $id );
		} ) );
	}

	private static function lesson_uses_characters( $lesson_id ) {
		$course_id = (int) get_post_meta( $lesson_id, '_tcnexus_course_id', true );
		return self::SHOW_POST_TYPE === get_post_type( $course_id );
	}

	public static function get_lesson_guest_ids( $lesson_id ) {
		$stored = get_post_meta( $lesson_id, self::LESSON_GUESTS_META_KEY, true );
		if ( '' !== $stored && false !== $stored ) {
			return self::sanitize_lesson_guest_ids( $stored );
		}
		$course_id = (int) get_post_meta( $lesson_id, '_tcnexus_course_id', true );
		$legacy_id = (int) get_post_meta( $course_id, '_tcnexus_guest_id', true );
		if ( ! $legacy_id ) {
			return array();
		}
		$first_lesson = get_posts( array( 'post_type' => 'tc_lesson', 'posts_per_page' => 1, 'post_status' => array( 'publish', 'draft' ), 'meta_key' => '_tcnexus_course_id', 'meta_value' => $course_id, 'orderby' => 'menu_order', 'order' => 'ASC', 'fields' => 'ids' ) );
		return ! empty( $first_lesson ) && (int) $first_lesson[0] === (int) $lesson_id ? self::sanitize_lesson_guest_ids( array( $legacy_id ) ) : array();
	}

	private static function migrate_legacy_course_guest_to_first_lesson( $course_id, $levels ) {
		$guest_ids = array( absint( get_post_meta( $course_id, '_tcnexus_guest_id', true ) ) );
		foreach ( (array) $levels as $level ) {
			if ( ! empty( $level['guest_id'] ) ) { $guest_ids[] = absint( $level['guest_id'] ); }
		}
		$guest_ids = self::sanitize_lesson_guest_ids( $guest_ids );
		if ( empty( $guest_ids ) ) { return; }
		$first_lesson = get_posts( array( 'post_type' => 'tc_lesson', 'posts_per_page' => 1, 'post_status' => array( 'publish', 'draft' ), 'meta_key' => '_tcnexus_course_id', 'meta_value' => $course_id, 'orderby' => 'menu_order', 'order' => 'ASC', 'fields' => 'ids' ) );
		if ( empty( $first_lesson ) ) { return; }
		$lesson_id = (int) $first_lesson[0];
		$existing = self::get_lesson_guest_ids( $lesson_id );
		update_post_meta( $lesson_id, self::LESSON_GUESTS_META_KEY, self::sanitize_lesson_guest_ids( array_merge( $existing, $guest_ids ) ) );
		delete_post_meta( $course_id, '_tcnexus_guest_id' );
	}

	public static function get_lesson_character_ids( $lesson_id ) {
		return self::sanitize_lesson_character_ids( get_post_meta( $lesson_id, self::LESSON_CHARACTERS_META_KEY, true ) );
	}

	public static function handle_delete_course() {
		$course_id = isset( $_GET['course_id'] ) ? absint( $_GET['course_id'] ) : 0;

		if ( ! $course_id || ! check_admin_referer( 'tcnexus_delete_course_' . $course_id ) ) {
			wp_die( 'Invalid request.' );
		}

		if ( ! current_user_can( 'delete_post', $course_id ) || self::content_type() !== get_post_type( $course_id ) ) {
			wp_die( 'You do not have permission to delete this ' . strtolower( self::content_label() ) . '.' );
		}

		wp_trash_post( $course_id );

		wp_safe_redirect( admin_url( 'admin.php?page=' . self::builder_page() . '&deleted=1' ) );
		exit;
	}

	private static function count_lessons( $course_id ) {
		$query = new WP_Query( array(
			'post_type'      => 'tc_lesson',
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'meta_key'       => '_tcnexus_course_id',
			'meta_value'     => $course_id,
		) );
		return (int) $query->found_posts;
	}

	private static function count_language_level_lessons( $course_id, $language_slug, $level_slug ) {
		$language_meta = array(
			'key'   => self::LANGUAGE_LESSON_META_KEY,
			'value' => $language_slug,
		);
		if ( 'en' === $language_slug ) {
			$language_meta = array(
				'relation' => 'OR',
				$language_meta,
				array(
					'key'     => self::LANGUAGE_LESSON_META_KEY,
					'compare' => 'NOT EXISTS',
				),
			);
		}
		$level_meta = array(
			'key'   => self::LEVEL_LESSON_META_KEY,
			'value' => $level_slug,
		);
		if ( 'beginner' === $level_slug ) {
			$level_meta = array(
				'relation' => 'OR',
				$level_meta,
				array(
					'key'     => self::LEVEL_LESSON_META_KEY,
					'compare' => 'NOT EXISTS',
				),
			);
		}

		$query = new WP_Query( array(
			'post_type'      => 'tc_lesson',
			'posts_per_page' => -1,
			'fields'         => 'ids',
			'post_status'    => array( 'publish', 'draft' ),
			'meta_query'     => array(
				'relation' => 'AND',
				array(
					'key'   => '_tcnexus_course_id',
					'value' => $course_id,
				),
			$language_meta,
			$level_meta,
			),
		) );

		return (int) $query->found_posts;
	}
}
