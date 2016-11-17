<?php

require_once('config.php');
require_once('auth.php');
require_once('verify_lib.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  exit(json_encode(array(
    'error' => 'tls_failure',
  )));
}

if (!user_logged_in()) {
  exit(json_encode(array(
    'error' => 'not_logged_in',
  )));
}

$viewer_id = get_viewer_id();
$result = $conn->query(
  "SELECT username, email, email_verified FROM users WHERE id = $viewer_id"
);
$user_row = $result->fetch_assoc();
$username = $user_row['username'];
$email = $user_row['email'];
$email_verified = $user_row['email_verified'];

if ($email_verified) {
  exit(json_encode(array(
    'error' => 'already_verified',
  )));
}

verify_email($viewer_id, $username, $email);

exit(json_encode(array(
  'success' => true,
)));
