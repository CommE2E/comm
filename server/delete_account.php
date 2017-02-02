<?php

require_once('config.php');
require_once('auth.php');
require_once('calendar_lib.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}

if (!user_logged_in()) {
  exit(json_encode(array(
    'error' => 'not_logged_in',
  )));
}
if (!isset($_POST['password'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

$user = get_viewer_id();
$password = $_POST['password'];

$result = $conn->query("SELECT hash FROM users WHERE id = $user");
$user_row = $result->fetch_assoc();
if (!$user_row) {
  exit(json_encode(array(
    'error' => 'internal_error',
  )));
}
if (!password_verify($password, $user_row['hash'])) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

$conn->query(
  "DELETE u, iu, v, iv, c, ic, r FROM users u ".
    "LEFT JOIN ids iu ON iu.id = u.id ".
    "LEFT JOIN verifications v ON v.user = u.id ".
    "LEFT JOIN ids iv ON iv.id = v.id ".
    "LEFT JOIN cookies c ON c.user = u.id ".
    "LEFT JOIN ids ic ON ic.id = c.id ".
    "LEFT JOIN roles r ON r.user = u.id ".
    "WHERE u.id = $user"
);

// TODO figure out what to do with calendars this account admins

delete_cookie('user');
$anonymous_viewer = init_anonymous_cookie();

exit(json_encode(array(
  'success' => true,
  'calendar_infos' => get_calendar_infos($anonymous_viewer),
)));
