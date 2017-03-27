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

get_viewer_info();

if (!isset($_POST['code'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

$verify_result = verify_code($_POST['code']);
if (!$verify_result) {
  exit(json_encode(array(
    'error' => 'invalid_code',
  )));
}

list($verify_user, $verify_field) = $verify_result;
if ($verify_field === VERIFY_FIELD_EMAIL) {
  $conn->query(
    "UPDATE users SET email_verified = 1 WHERE id = $verify_user"
  );
  clear_verify_codes($verify_user, $verify_field);
  exit(json_encode(array(
    'success' => true,
    'verify_field' => $verify_field,
  )));
} else if ($verify_field === VERIFY_FIELD_RESET_PASSWORD) {
  $result = $conn->query(
    "SELECT username FROM users WHERE id = $verify_user"
  );
  $reset_password_user_row = $result->fetch_assoc();
  $reset_password_username = $reset_password_user_row['username'];
  exit(json_encode(array(
    'success' => true,
    'verify_field' => $verify_field,
    'username' => $reset_password_username,
  )));
} else {
  exit(json_encode(array(
    'error' => 'unhandled_field',
  )));
}
