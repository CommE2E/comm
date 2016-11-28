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
  $cookie_hash = $conn->real_escape_string($_COOKIE['user']);
  $result = $conn->query(
    "SELECT id FROM cookies ".
      "WHERE hash = UNHEX('$cookie_hash') AND user IS NOT NULL"
  );
  $cookie_row = $result->fetch_assoc();
  if ($cookie_row) {
    $id = $cookie_row['id'];
    $conn->query("DELETE FROM cookies WHERE id = $id");
    $conn->query("DELETE FROM ids WHERE id = $id");
  }
}

delete_cookie('user');
$anonymous_viewer = init_anonymous_cookie();

exit(json_encode(array(
  'success' => true,
  'calendar_infos' => get_calendar_infos($anonymous_viewer),
)));
