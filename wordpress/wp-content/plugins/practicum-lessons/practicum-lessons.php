<?php
/**
 * Plugin Name: Practicum Lessons
 * Description: Регистрация мета-полей lesson для WP REST API
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