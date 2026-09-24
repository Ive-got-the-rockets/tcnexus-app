<?php
if ( ! defined( 'ABSPATH' ) ) { exit; }

/** Organizes attachments by relationship without moving or copying files. */
class TCNexus_Media_Library {
	const FOLDER_META_KEY = '_tcnexus_media_folder_key';
	const OWNER_TYPE_META_KEY = '_tcnexus_media_owner_type';
	const OWNER_ID_META_KEY = '_tcnexus_media_owner_id';

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
		update_post_meta( $attachment_id, self::FOLDER_META_KEY, $key );
		update_post_meta( $attachment_id, self::OWNER_TYPE_META_KEY, $owner_type );
		update_post_meta( $attachment_id, self::OWNER_ID_META_KEY, absint( $owner_id ) );
		return $key;
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
			$folders[] = array( 'key' => self::folder_key( 'tc_show' === $post->post_type ? 'show' : 'course', $post->ID ), 'label' => $post->post_title, 'group' => 'tc_show' === $post->post_type ? 'shows' : 'courses' );
		}
		return array_merge( $folders, array(
			array( 'key' => 'instructors', 'label' => 'Instructors', 'group' => 'people' ),
			array( 'key' => 'guests', 'label' => 'Guests', 'group' => 'people' ),
			array( 'key' => 'characters', 'label' => 'Characters', 'group' => 'people' ),
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
	}
}
