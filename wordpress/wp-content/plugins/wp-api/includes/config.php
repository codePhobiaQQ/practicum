<?php

/**
 * Fallback, если полноценный Config из основного проекта не подключён.
 */
if (!class_exists('Config')) {
  class Config
  {
    private static $data = [
      'auth' => [
        'registration' => [
          'valid_roles' => ['subscriber', 'contributor', 'author', 'editor', 'administrator'],
        ],
      ],
    ];

    public static function getData(array $path, $key)
    {
      $cursor = self::$data;
      foreach ($path as $segment) {
        if (!isset($cursor[$segment])) {
          return null;
        }
        $cursor = $cursor[$segment];
      }
      return isset($cursor[$key]) ? $cursor[$key] : null;
    }

    public static function getError(array $path, $code, $status)
    {
      $messages = [
        'missing_params' => 'Не переданы обязательные поля.',
        'user_exists' => 'Пользователь уже существует.',
        'creation_failed' => 'Не удалось завершить регистрацию.',
        'incorrect credentials' => 'Неверный логин или пароль.',
        'jwt_unavailable' => 'Сервис выдачи токенов недоступен.',
      ];
      $message = isset($messages[$code]) ? $messages[$code] : (string) $code;
      return new WP_Error($code, $message, ['status' => $status]);
    }
  }
}
