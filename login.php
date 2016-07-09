<?php

require_once('config.php');
require_once('auth.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  exit(json_encode(array(
    'error' => 'tls_failure',
  )));
}

if (!isset($_POST['username']) || !isset($_POST['password'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$username = $conn->real_escape_string($_POST['username']);
$password = $_POST['password'];
if (isset($_COOKIE['user'])) {
  exit(json_encode(array(
    'error' => 'already_logged_in',
  )));
}

$result = $conn->query(
  "SELECT id, LOWER(HEX(salt)) AS salt, LOWER(HEX(hash)) AS hash ".
    "FROM users WHERE username = '$username' OR email = '$username'"
);
$user_row = $result->fetch_assoc();
if (!$user_row) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$hash = hash('sha512', $password.$user_row['salt']);
if ($user_row['hash'] !== $hash) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

create_user_cookie($user_row['id']);

exit(json_encode(array(
  'success' => true,
)));
