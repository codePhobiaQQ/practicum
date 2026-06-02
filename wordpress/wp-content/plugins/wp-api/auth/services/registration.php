<?php

function registration($request)
{
  $username = $request->get_param("username");
  $password = $request->get_param("password");
  $role = $request->get_param("role");
  $user_name = trim((string) $request->get_param("user_name"));
  $group_number = trim((string) $request->get_param("group_number"));

  if ($user_name === "" || $group_number === "") {
    return Config::getError(["auth", "registration"], "missing_params", 400);
  }

  // Check if user exists
  if (username_exists($username)) {
    return Config::getError(["auth", "registration"], "user_exists", 400);
  }

  // REGISTER USER
  $user_id = wp_create_user($username, $password, $username);
  if (is_wp_error($user_id)) {
    return $user_id;
  }

  // REGISTER MOODLE USER (опционально — плагин интеграции)
  if (function_exists("isMoodleUserExists") && function_exists("createMoodleUser")) {
    if (isMoodleUserExists($username)) {
      wp_delete_user($user_id);
      return Config::getError(["auth", "registration"], "user_exists", 400);
    }

    $requestMoodle = new WP_REST_Request("POST");
    $requestMoodle->set_body_params([
      "wp_user_id" => $user_id,
      "email" => $username
    ]);

    $responseMoodle = createMoodleUser($requestMoodle);
    if (is_wp_error($responseMoodle)) {
      wp_delete_user($user_id);
      return Config::getError(["auth", "registration"], "creation_failed", 500);
    }
  }

  // SET USER ROLE
  $user = new WP_User($user_id);
  $user->set_role($role);

  update_user_meta($user_id, "user_name", $user_name);
  update_user_meta($user_id, "group_number", $group_number);

  // GENERATE JWT TOKEN
  $jwt_token = get_jwt_token($username, $password);
  if (is_wp_error($jwt_token)) {
    return $jwt_token;
  }

  return new WP_REST_Response(["token" => $jwt_token], 200);
}

function get_jwt_token($username, $password)
{
  if (!class_exists("Jwt_Auth") || !class_exists("Jwt_Auth_Public")) {
    return Config::getError(["auth", "jwt"], "jwt_unavailable", 503);
  }

  $requestJWT = new WP_REST_Request("POST");
  $requestJWT->set_body_params([
    "username" => $username,
    "password" => $password,
  ]);
  $jwt = new Jwt_Auth();
  $tokenizer = new Jwt_Auth_Public($jwt->get_plugin_name(), $jwt->get_version());
  $token = $tokenizer->generate_token($requestJWT);

  if (is_wp_error($token)) {
    return Config::getError(["auth", "jwt"], "incorrect credentials", 403);
  }

  return $token["token"];
}
