<?php

require_once('config.php');
require_once('auth.php');

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
if (!isset($_POST['calendar']) || !isset($_POST['password'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

$user = get_viewer_id();
$calendar = (int)$_POST['calendar'];
$password = $_POST['password'];

$result = $conn->query(
  "SELECT hash ".
    "FROM roles r LEFT JOIN users u ON u.id = r.user ".
    "WHERE r.calendar = $calendar AND r.user = $user ".
    "AND r.role >= ".ROLE_CREATOR
);
$row = $result->fetch_assoc();
if (!$row) {
  exit(json_encode(array(
    'error' => 'internal_error',
  )));
}
if (!password_verify($password, $row['hash'])) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

$conn->query("DELETE FROM calendars WHERE id = $calendar");
$conn->query("DELETE FROM roles WHERE calendar = $calendar");
$conn->query("DELETE FROM ids WHERE id = $calendar");

exit(json_encode(array(
  'success' => true,
)));
