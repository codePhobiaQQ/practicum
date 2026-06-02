<?php

function getUserMetadata()
{
  $user_id = get_current_user_id();
  if (!$user_id) {
    return Config::getError(["user", "metadata"], "unauthorized", 401);
  }

  $user = get_userdata($user_id);
  if (!$user) {
    return Config::getError(["user", "metadata"], "not_found", 404);
  }

  return new WP_REST_Response([
    "user_id" => $user_id,
    "username" => $user->user_login,
    "email" => $user->user_email,
    "user_name" => (string) get_user_meta($user_id, "user_name", true),
    "group_number" => (string) get_user_meta($user_id, "group_number", true),
  ], 200);
}

function updateUserMetadata($request)
{
  $user_id = get_current_user_id();
  if (!$user_id) {
    return Config::getError(["user", "metadata"], "unauthorized", 401);
  }

  $user_name = trim((string) $request->get_param("user_name"));
  $group_number = trim((string) $request->get_param("group_number"));

  if ($user_name === "" || $group_number === "") {
    return Config::getError(["user", "metadata"], "missing_params", 400);
  }

  update_user_meta($user_id, "user_name", $user_name);
  update_user_meta($user_id, "group_number", $group_number);

  return getUserMetadata();
}
