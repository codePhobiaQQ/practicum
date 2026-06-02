<?php

require_once plugin_dir_path(__FILE__) . "services/registration.php";
require_once plugin_dir_path(__FILE__) . "services/login.php";


function authEndpoints()
{
  // Login was done by the lib JWT wordpress auth

  // Registration route
  register_rest_route(
    "custom/v2",
    "/auth/registration",

    [
      "methods" => WP_REST_Server::CREATABLE,
      "callback" => "registration",
      "permission_callback" => "__return_true",

      "args" => [
        "username" => [
          "description" => "Email",
          "type" => "string",
          "required" => true,
          "sanitize_callback" => "sanitize_email",
          "validate_callback" => "rest_validate_request_arg",
          "format" => "email",
        ],
        "password" => [
          "description" => "Пароль",
          "type" => "string",
          "required" => true,
          "sanitize_callback" => "sanitize_text_field",
          "validate_callback" => "rest_validate_request_arg",
        ],
        "role" => [
          "description" => "Роль",
          "type" => "string",
          "required" => false,
          "default" => "subscriber",
          "sanitize_callback" => "sanitize_text_field",
          "validate_callback" => "rest_validate_request_arg",
          "enum" => Config::getData(["auth", "registration"], "valid_roles"),
        ],
        "user_name" => [
          "description" => "ФИО / отображаемое имя",
          "type" => "string",
          "required" => true,
          "sanitize_callback" => "sanitize_text_field",
          "validate_callback" => "rest_validate_request_arg",
        ],
        "group_number" => [
          "description" => "Номер группы",
          "type" => "string",
          "required" => true,
          "sanitize_callback" => "sanitize_text_field",
          "validate_callback" => "rest_validate_request_arg",
        ],
      ],
    ]
  );

  // Registration route
  register_rest_route(
    "custom/v2",
    "/auth/login",

    [
      "methods" => WP_REST_Server::CREATABLE,
      "callback" => "login",
      "permission_callback" => "__return_true",

      "args" => [
        "username" => [
          "description" => "Email",
          "type" => "string",
          "required" => true,
          "sanitize_callback" => "sanitize_email",
          "validate_callback" => "rest_validate_request_arg",
          "format" => "email",
        ],
        "password" => [
          "description" => "Пароль",
          "type" => "string",
          "required" => true,
          "sanitize_callback" => "sanitize_text_field",
          "validate_callback" => "rest_validate_request_arg",
        ],
      ],
    ]
  );
}
