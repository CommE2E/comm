<?php

require_once('config.php');
require_once('auth.php');
require_once('calendar_lib.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  exit(json_encode(array(
    'error' => 'tls_failure',
  )));
}

if (isset($_COOKIE['user'])) {
  list($cookie_id, $cookie_password) = explode(':', $_COOKIE['user']);
  $cookie_id = intval($cookie_id);
  $result = $conn->query(
    "SELECT hash FROM cookies WHERE id = $cookie_id AND user IS NOT NULL"
  );
  $cookie_row = $result->fetch_assoc();
  if ($cookie_row && password_verify($cookie_password, $cookie_row['hash'])) {
    $conn->query("DELETE FROM cookies WHERE id = $cookie_id");
    $conn->query("DELETE FROM ids WHERE id = $cookie_id");
  }
}

delete_cookie('user');
$anonymous_viewer = init_anonymous_cookie();

exit(json_encode(array(
  'success' => true,
  'calendar_infos' => get_calendar_infos($anonymous_viewer),
)));
