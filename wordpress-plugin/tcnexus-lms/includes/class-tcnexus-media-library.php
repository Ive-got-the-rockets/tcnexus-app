<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/** Organizes attachments by relationship without moving or copying files. */
class TCNexus_Media_Library {
	const FOLDER_META_KEY = '_tcnexus_media_folder_key';
	const OWNER_TYPE_META_KEY = '_tcnexus_media_owner_type';
	const OWNER_ID_META_KEY = '_tcnexus_media_owner_id';
	const COURSE_LEVELS = array( 'beginner', 'intermediate', 'advanced' );

	public static function level_folder_key( $course_id, $level ) {
		return 'content-course-' . absint( $course_id ) . '--level-' . sanitize_key( $level );
	}

	public static function season_folder_key( $show_id, $season ) {
		return 'content-show-' . absint( $show_id ) . '--season-' . sanitize_key( $season );
	}

	public static function assign_attachment( $attachment_id, $owner_type = 'unsorted', $owner_id = 0 ) {
		$attachment_id = absint( $attachment_id );
		if ( ! $attachment_id || 'attachment' !== get_post_type( $attachment_id ) ) { return 'unsorted'; }
		$owner_type = sanitize_key( $owner_type );
		$key = self::folder_key( $owner_type, $owner_id );
		if ( preg_match( '/^content-(course|show)-(\d+)$/', $owner_type, $matches ) ) {
			$parent = get_post( absint( $matches[2] ) );
			if ( $parent && ( ( 'course' === $matches[1] && 'tc_course' === $parent->post_type ) || ( 'show' === $matches[1] && 'tc_show' === $parent->post_type ) ) ) {
				$key = $owner_type;
			}
		}
		if ( preg_match( '/^content-course-(\d+)--level-(beginner|intermediate|advanced)$/', $owner_type, $matches ) ) {
			$parent = get_post( absint( $matches[1] ) );
			if ( $parent && 'tc_course' === $parent->post_type ) { $key = $owner_type; }
		}
		if ( preg_match( '/^content-show-(\d+)--season-(season-\d+)$/', $owner_type, $matches ) ) {
			$parent = get_post( absint( $matches[1] ) );
			if ( $parent && 'tc_show' === $parent->post_type ) { $key = $owner_type; }
		}
		update_post_meta( $attachment_id, self::FOLDER_META_KEY, $key );
		update_post_meta( $attachment_id, self::OWNER_TYPE_META_KEY, $owner_type );
		update_post_meta( $attachment_id, self::OWNER_ID_META_KEY, absint( $owner_id ) );
		return $key;
	}

	public static function assign_folder_key( $attachment_id, $folder_key ) {
		$attachment_id = absint( $attachment_id );
		$folder_key = sanitize_key( $folder_key );
		if ( ! $attachment_id || 'attachment' !== get_post_type( $attachment_id ) ) { return 'unsorted'; }
		$valid = in_array( $folder_key, array( 'unsorted', 'instructors', 'guests', 'characters' ), true )
			|| preg_match( '/^content-(course|show)-\d+$/', $folder_key )
			|| preg_match( '/^content-course-\d+--level-(beginner|intermediate|advanced)$/', $folder_key )
			|| preg_match( '/^content-show-\d+--season-season-\d+$/', $folder_key );
		if ( ! $valid ) { return self::attachment_folder_key( $attachment_id ); }
		update_post_meta( $attachment_id, self::FOLDER_META_KEY, $folder_key );
		return $folder_key;
	}

	public static function assign_lesson_thumbnail( $lesson_id, $course_id, $level ) {
		$thumbnail_id = (int) get_post_thumbnail_id( $lesson_id );
		if ( ! $thumbnail_id ) { return; }
		if ( 'tc_show' === get_post_type( $course_id ) ) {
			self::assign_folder_key( $thumbnail_id, self::season_folder_key( $course_id, $level ) );
			return;
		}
		self::assign_folder_key( $thumbnail_id, self::level_folder_key( $course_id, $level ) );
	}

	public static function folder_key( $owner_type, $owner_id = 0 ) {
		$owner_type = sanitize_key( $owner_type );
		if ( in_array( $owner_type, array( 'unsorted', 'instructors', 'guests', 'characters' ), true ) ) { return $owner_type; }
		if ( in_array( $owner_type, array( 'course', 'show' ), true ) && absint( $owner_id ) ) { return 'content-' . $owner_type . '-' . absint( $owner_id ); }
		return 'unsorted';
	}

	public static function folder_label( $folder_key ) {
		if ( 'unsorted' === $folder_key ) { return 'Unsorted'; }
		$fixed = array( 'instructors' => 'Instructors', 'guests' => 'Guests', 'characters' => 'Characters' );
		if ( isset( $fixed[ $folder_key ] ) ) { return $fixed[ $folder_key ]; }
		if ( preg_match( '/^content-(course|show)-(\d+)$/', (string) $folder_key, $matches ) ) {
			$post = get_post( absint( $matches[2] ) );
			return $post ? $post->post_title : 'Archived Content';
		}
		if ( preg_match( '/^content-course-(\d+)--level-(beginner|intermediate|advanced)$/', (string) $folder_key, $matches ) ) {
			return ucfirst( $matches[2] );
		}
		if ( preg_match( '/^content-show-(\d+)--season-(season-\d+)$/', (string) $folder_key, $matches ) ) {
			return 'Season ' . absint( substr( $matches[2], 7 ) );
		}
		return 'Unsorted';
	}

	public static function attachment_folder_key( $attachment_id ) {
		return get_post_meta( absint( $attachment_id ), self::FOLDER_META_KEY, true ) ?: 'unsorted';
	}

	public static function assign_posted_media( $payload, $owner_type, $owner_id ) {
		if ( ! is_array( $payload ) ) { return; }
		foreach ( $payload as $field => $value ) {
			if ( is_array( $value ) ) { self::assign_posted_media( $value, $owner_type, $owner_id ); continue; }
			if ( ! preg_match( '/(?:image|thumbnail|background|title).*_id$|^thumbnail_id$/', (string) $field ) ) { continue; }
			$attachment_id = absint( $value );
			if ( $attachment_id ) { self::assign_attachment( $attachment_id, $owner_type, $owner_id ); }
		}
	}

	public static function get_folders() {
		$folders = array( array( 'key' => 'unsorted', 'label' => 'Unsorted', 'group' => 'root' ) );
		foreach ( get_posts( array( 'post_type' => array( 'tc_course', 'tc_show' ), 'post_status' => array( 'publish', 'draft' ), 'posts_per_page' => -1, 'orderby' => 'title', 'order' => 'ASC' ) ) as $post ) {
			$is_course = 'tc_course' === $post->post_type;
			$root_key = self::folder_key( $is_course ? 'course' : 'show', $post->ID );
			$folders[] = array( 'key' => $root_key, 'label' => $post->post_title, 'group' => $is_course ? 'courses' : 'shows', 'parent' => '' );
			if ( $is_course ) {
				$levels = method_exists( 'TCNexus_Course_Builder', 'get_course_levels' ) ? TCNexus_Course_Builder::get_course_levels( $post->ID ) : array();
				foreach ( self::COURSE_LEVELS as $level ) {
					$lesson_ids = get_posts( array( 'post_type' => 'tc_lesson', 'post_status' => array( 'publish', 'draft' ), 'posts_per_page' => 1, 'fields' => 'ids', 'meta_key' => '_tcnexus_course_id', 'meta_value' => $post->ID, 'meta_query' => array( array( 'key' => '_tcnexus_course_level', 'value' => $level ) ) ) );
					if ( 'beginner' !== $level && empty( $levels[ $level ]['enabled'] ) && empty( $lesson_ids ) ) { continue; }
					$folders[] = array( 'key' => self::level_folder_key( $post->ID, $level ), 'label' => ucfirst( $level ), 'group' => 'courses', 'parent' => $root_key );
				}
			} else {
				$seasons = method_exists( 'TCNexus_Course_Builder', 'get_course_seasons' ) ? TCNexus_Course_Builder::get_course_seasons( $post->ID ) : array( 'season-1' => array( 'enabled' => true ) );
				foreach ( (array) $seasons as $season => $season_data ) {
					$season = sanitize_key( $season );
					if ( ! preg_match( '/^season-\d+$/', $season ) ) { continue; }
					$episode_ids = get_posts( array( 'post_type' => 'tc_lesson', 'post_status' => array( 'publish', 'draft' ), 'posts_per_page' => 1, 'fields' => 'ids', 'meta_key' => '_tcnexus_course_id', 'meta_value' => $post->ID, 'meta_query' => array( array( 'key' => '_tcnexus_course_level', 'value' => $season ) ) ) );
					if ( empty( $season_data['enabled'] ) && empty( $episode_ids ) ) { continue; }
					$folders[] = array( 'key' => self::season_folder_key( $post->ID, $season ), 'label' => 'Season ' . absint( substr( $season, 7 ) ), 'group' => 'shows', 'parent' => $root_key );
				}
			}
		}
		return array_merge( $folders, array(
			array( 'key' => 'instructors', 'label' => 'Instructors', 'group' => 'people', 'parent' => '' ),
			array( 'key' => 'guests', 'label' => 'Guests', 'group' => 'people', 'parent' => '' ),
			array( 'key' => 'characters', 'label' => 'Characters', 'group' => 'people', 'parent' => '' ),
		) );
	}

	public static function organize_existing_media() {
		foreach ( get_posts( array( 'post_type' => 'attachment', 'post_status' => 'inherit', 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $attachment_id ) {
			if ( get_post_meta( $attachment_id, self::FOLDER_META_KEY, true ) ) { continue; }
			$parent = get_post( wp_get_post_parent_id( $attachment_id ) );
			if ( $parent && in_array( $parent->post_type, array( 'tc_course', 'tc_show' ), true ) ) { self::assign_attachment( $attachment_id, 'tc_show' === $parent->post_type ? 'show' : 'course', $parent->ID ); }
			elseif ( $parent && 'tc_character' === $parent->post_type ) { self::assign_attachment( $attachment_id, 'characters', 0 ); }
			elseif ( $parent && 'tc_instructor' === $parent->post_type ) { self::assign_attachment( $attachment_id, 'guest' === TCNexus_Post_Types::get_person_role( $parent->ID ) ? 'guests' : 'instructors', 0 ); }
			else { self::assign_attachment( $attachment_id, 'unsorted', 0 ); }
		}
		foreach ( get_posts( array( 'post_type' => 'tc_lesson', 'post_status' => array( 'publish', 'draft' ), 'posts_per_page' => -1, 'fields' => 'ids' ) ) as $lesson_id ) {
			$course_id = (int) get_post_meta( $lesson_id, '_tcnexus_course_id', true );
			if ( $course_id && in_array( get_post_type( $course_id ), array( 'tc_course', 'tc_show' ), true ) ) { self::assign_lesson_thumbnail( $lesson_id, $course_id, get_post_meta( $lesson_id, '_tcnexus_course_level', true ) ?: ( 'tc_show' === get_post_type( $course_id ) ? 'season-1' : 'beginner' ) ); }
		}
	}
}
