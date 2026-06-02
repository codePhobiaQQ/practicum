<?php

function login($request)
{
  $token = get_jwt_token($request->get_param("username"), $request->get_param("password"));
  return $token;
}