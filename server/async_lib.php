<?php

require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');

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
  if (cookie_has_changed()) {
    $cookie_invalidated = cookie_invalidated();
    list($thread_infos, $users) = get_thread_infos();
    $payload['cookieChange'] = array(
      'threadInfos' => $thread_infos,
      'userInfos' => array_values($users),
      'cookieInvalidated' => $cookie_invalidated,
    );
    $viewer_info = get_viewer_info();
    // Only include in the raw response since on web we want it to be httponly
    if (isset($_POST['cookie'])) {
      $payload['cookieChange']['cookie'] = $viewer_info[3];
    }
    if ($cookie_invalidated) {
      $payload['cookieChange']['currentUserInfo'] = array(
        'id' => (string)$viewer_info[0],
        'anonymous' => true,
      );
    }
  }
  async_exit($payload);
}
