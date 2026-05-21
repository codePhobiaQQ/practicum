<?php
/**
 * Plugin Name: Practicum Search
 * Description: REST-эндпоинт поиска курсов через ElasticSearch
 * Version: 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// --- 1. Говорим ElasticPress индексировать ACF-поля курсов ---

add_filter( 'ep_prepare_meta_allowed_protected_keys', function( $allowed_keys ) {
    $acf_fields = [
        'course_name',
        'description',
        'teaser',
        'duration',
        'subtitle',
    ];
    return array_merge( $allowed_keys, $acf_fields );
});

// --- 2. Включаем поддержку CPT "course" в ElasticPress ---

add_filter( 'ep_indexable_post_types', function( $post_types ) {
    $post_types['course'] = 'course';
    return $post_types;
});

// --- 3. Регистрируем REST-эндпоинт ---

add_action( 'rest_api_init', function() {
    register_rest_route( 'practicum/v1', '/search', [
        'methods'             => 'GET',
        'callback'            => 'practicum_search_courses',
        'permission_callback' => '__return_true', // публичный эндпоинт
        'args'                => [
            'q' => [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'default'           => '',
            ],
            'per_page' => [
                'type'    => 'integer',
                'default' => 50,
            ],
            'page' => [
                'type'    => 'integer',
                'default' => 1,
            ],
        ],
    ]);
});

// --- 4. Обработчик запроса ---

function practicum_search_courses( WP_REST_Request $request ) {
    $q        = trim( $request->get_param( 'q' ) );
    $per_page = (int) $request->get_param( 'per_page' );
    $page     = (int) $request->get_param( 'page' );

    $args = [
        'post_type'      => 'course',
        'post_status'    => 'publish',
        'posts_per_page' => $per_page,
        'paged'          => $page,
    ];

    // Если есть поисковый запрос — добавляем 's',
    // ElasticPress перехватит WP_Query и пойдёт в ES вместо MySQL
    if ( $q !== '' ) {
        $args['s'] = $q;
    }

    $query = new WP_Query( $args );
    $posts = $query->posts;

    // Подключаем ACF для получения кастомных полей
    $results = array_map( function( $post ) {
        $acf = function_exists( 'get_fields' ) ? get_fields( $post->ID ) : [];
        return [
            'id'      => $post->ID,
            'slug'    => $post->post_name,
            'title'   => [ 'rendered' => $post->post_title ],
            'excerpt' => [ 'rendered' => $post->post_excerpt ],
            'acf'     => $acf ?: new stdClass(),
            // таксономии
            'cource-category' => wp_get_post_terms( $post->ID, 'cource-category', ['fields' => 'ids'] ),
            'cource-subject'  => wp_get_post_terms( $post->ID, 'cource-subject',  ['fields' => 'ids'] ),
            'cource-tread'    => wp_get_post_terms( $post->ID, 'cource-tread',    ['fields' => 'ids'] ),
        ];
    }, $posts );

    return rest_ensure_response( [
        'total'    => (int) $query->found_posts,
        'pages'    => (int) $query->max_num_pages,
        'page'     => $page,
        'per_page' => $per_page,
        'courses'  => $results,
    ]);
}