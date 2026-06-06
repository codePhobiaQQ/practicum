<?php
/**
 * Plugin Name: Practicum Meta
 * Description: Регистрация мета-полей для WP REST API
 * Version: 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

add_action( 'init', function() {
    register_meta( 'post', 'lesson_course', [
        'object_subtype' => 'lesson',
        'type'           => 'integer',
        'single'         => true,
        'show_in_rest'   => true,
    ]);

    register_meta( 'post', 'lesson_order', [
        'object_subtype' => 'lesson',
        'type'           => 'integer',
        'single'         => true,
        'show_in_rest'   => true,
    ]);
});

// Разрешаем WordPress REST API выполнять сортировку по мета-полям (orderby=meta_value_num)
add_filter( 'rest_lesson_collection_params', function( $params ) {
    if ( isset( $params['orderby'] ) ) {
        // Добавляем meta_value_num в список разрешенных вариантов (enum)
        $params['orderby']['enum'][] = 'meta_value_num';
    }
    return $params;
}, 10, 1 );

// Разрешаем фильтрацию уроков по мета-полям через REST API
add_filter( 'rest_lesson_query', function( $args, $request ) {
    // Проверяем, пришли ли параметры meta_key и meta_value в URL-запросе
    $meta_key   = $request->get_param( 'meta_key' );
    $meta_value = $request->get_param( 'meta_value' );

    if ( ! empty( $meta_key ) && ! empty( $meta_value ) ) {
        $args['meta_key']   = sanitize_text_field( $meta_key );
        $args['meta_value'] = sanitize_text_field( $meta_value );
    }

    return $args;
}, 10, 2 );

///////////////////////////////////////////////s

add_action( 'init', function() {
    register_meta( 'post', 'course_book', [
        'object_subtype' => 'course',
        'type'           => 'integer',
        'single'         => true,
        'show_in_rest'   => true,
    ]);

    register_meta( 'post', 'book_order', [
        'object_subtype' => 'course',
        'type'           => 'integer',
        'single'         => true,
        'show_in_rest'   => true,
    ]);
});

// Разрешаем orderby=meta_value_num в REST-запросах к course
add_filter( 'rest_course_collection_params', function( $params ) {
    if ( isset( $params['orderby'] ) ) {
        $params['orderby']['enum'][] = 'meta_value_num';
    }
    return $params;
}, 10, 1 );

// Разрешаем фильтрацию курсов по мета-полям через REST API
// Используется для: GET /wp-json/wp/v2/course?meta_key=book_course&meta_value={book_course}
add_filter( 'rest_course_query', function( $args, $request ) {
    $meta_key   = $request->get_param( 'meta_key' );
    $meta_value = $request->get_param( 'meta_value' );

    if ( ! empty( $meta_key ) && ! empty( $meta_value ) ) {
        $args['meta_key']   = sanitize_text_field( $meta_key );
        $args['meta_value'] = sanitize_text_field( $meta_value );
    }

    return $args;
}, 10, 2 );
