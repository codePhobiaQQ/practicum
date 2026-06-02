<?php

require_once plugin_dir_path(__FILE__) . "services/metadata.php";

function userEndpoints()
{
  register_rest_route(
    "custom/v2",
    "/user/metadata",
    [
      "methods" => WP_REST_Server::READABLE,
      "callback" => "getUserMetadata",
      "permission_callback" => "is_user_logged_in",
    ]
  );

  register_rest_route(
    "custom/v2",
    "/user/metadata",
    [
      "methods" => WP_REST_Server::EDITABLE,
      "callback" => "updateUserMetadata",
      "permission_callback" => "is_user_logged_in",
      "args" => [
        "user_name" => [
          "type" => "string",
          "required" => true,
          "sanitize_callback" => "sanitize_text_field",
          "validate_callback" => "rest_validate_request_arg",
        ],
        "group_number" => [
          "type" => "string",
          "required" => true,
          "sanitize_callback" => "sanitize_text_field",
          "validate_callback" => "rest_validate_request_arg",
        ],
      ],
    ]
  );
}
