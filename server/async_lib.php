<?php

require_once('config.php');
require_once('auth.php');

function async_exit($payload) {
  exit(json_encode($payload));
}

function async_start() {
  global $https;

  header("Content-Type: application/json");

  if ($https && !isset($_SERVER['HTTPS'])) {
    // Using mod_rewrite .htaccess for HTTPS redirect, so this shouldn't happen
    header(
      $_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error',
      true,
      500
    );
    async_exit(array(
      'error' => 'tls_failure',
    ));
  }

  // Make sure a cookie is set
  get_viewer_info();
}

function async_end($payload) {
  // If there's been a cookie invalidation, tell the user about it
  async_exit($payload);
}
