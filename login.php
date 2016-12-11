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

if (user_logged_in()) {
  exit(json_encode(array(
    'error' => 'already_logged_in',
  )));
}
if (!isset($_POST['username']) || !isset($_POST['password'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$username = $conn->real_escape_string($_POST['username']);
$password = $_POST['password'];

$result = $conn->query(
  "SELECT id, hash, username, email, email_verified ".
    "FROM users WHERE username = '$username' OR email = '$username'"
);
$user_row = $result->fetch_assoc();
if (!$user_row) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
if (!password_verify($password, $user_row['hash'])) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

$id = intval($user_row['id']);
create_user_cookie($id);

exit(json_encode(array(
  'success' => true,
  'username' => $user_row['username'],
  'email' => $user_row['email'],
  'email_verified' => (bool)$user_row['email_verified'],
  'calendar_infos' => get_calendar_infos($id),
)));
