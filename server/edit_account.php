<?php

require_once('config.php');
require_once('auth.php');
require_once('verify_lib.php');

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
if (
  !isset($_POST['email']) ||
  !isset($_POST['new_password']) ||
  !isset($_POST['old_password'])
) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

$user = get_viewer_id();
$old_password = $_POST['old_password'];
$new_password = $_POST['new_password'];
$email = $_POST['email'];

$result = $conn->query(
  "SELECT username, email, hash FROM users WHERE id=\"$user\""
);
$user_row = $result->fetch_assoc();
if (!$user_row) {
  exit(json_encode(array(
    'error' => 'internal_error',
  )));
}
if (!password_verify($old_password, $user_row['hash'])) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

$change_email = "";
if ($user_row['email'] !== $email) {
  $valid_email_regex = "/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+".
    "@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?".
    "(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/";
  if (!preg_match($valid_email_regex, $email)) {
    exit(json_encode(array(
      'error' => 'invalid_email',
    )));
  }
  $result = $conn->query(
    "SELECT COUNT(id) AS count FROM users WHERE email = '$email'"
  );
  $matching_email_row = $result->fetch_assoc();
  if ($matching_email_row['count'] !== '0') {
    exit(json_encode(array(
      'error' => 'email_taken',
    )));
  }
  $escaped_email = $conn->real_escape_string($email);
  $change_email = "email = '$escaped_email', email_verified = 0";
  verify_email($user, $user_row['username'], $email);
}

$change_password = "";
if ($new_password !== '') {
  $hash = password_hash($new_password, PASSWORD_BCRYPT);
  $change_password = "hash = '$hash'";
}

$set_clause = implode(
  ', ',
  array_filter(array($change_email, $change_password))
);
if ($set_clause) {
  $conn->query("UPDATE users SET $set_clause WHERE id=$user");
}

exit(json_encode(array(
  'success' => true,
)));
