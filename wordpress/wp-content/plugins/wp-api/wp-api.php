<?php

/**
 * Plugin Name: Custom API
 * Plugin URI: http://chrushingit.com
 * Description: Custom API for olymp website
 * Version: 1.1
 * Author: Vitali Peregudov
 * Author URI: http://watch-learn.com
 */

require_once plugin_dir_path(__FILE__) . "includes/config.php";
require_once plugin_dir_path(__FILE__) . "auth/route.php";
require_once plugin_dir_path(__FILE__) . "user/route.php";

error_reporting(E_ERROR | E_CORE_ERROR);
add_action('rest_api_init', function () {
    authEndpoints();
    userEndpoints();
});
