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

if (user_logged_in()) {
  exit(json_encode(array(
    'error' => 'already_logged_in',
  )));
}
if (!isset($_POST['username'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$username = $_POST['username'];

$result = $conn->query(
  "SELECT id, username, email ".
    "FROM users WHERE username = '$username' OR email = '$username'"
);
$user_row = $result->fetch_assoc();
if (!$user_row) {
  exit(json_encode(array(
    'error' => 'invalid_user',
  )));
}
$id = $user_row['id'];
$username = $user_row['username'];
$email = $user_row['email'];

// send email here

exit(json_encode(array(
  'success' => true,
)));

