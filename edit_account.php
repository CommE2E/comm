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
  "SELECT username, email, LOWER(HEX(salt)) AS salt, LOWER(HEX(hash)) AS hash ".
    "FROM users WHERE id=\"$user\""
);
$user_row = $result->fetch_assoc();
if (!$user_row) {
  exit(json_encode(array(
    'error' => 'internal_error',
  )));
}
$hash = hash('sha512', $old_password.$user_row['salt']);
if ($user_row['hash'] !== $hash) {
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
  $escaped_email = $conn->real_escape_string($email);
  $change_email = "email = '$escaped_email', email_verified = 0";
  verify_email($user, $user_row['username'], $email);
}

$change_password = "";
if ($new_password !== '') {
  $salt = md5(openssl_random_pseudo_bytes(32));
  $hash = hash('sha512', $new_password.$salt);
  $change_password = "salt = UNHEX('$salt'), hash = UNHEX('$hash')";
}

$set_clause = implode(
  ', ',
  array_filter(array($change_email, $change_password)),
);
if ($set_clause) {
  $conn->query("UPDATE users SET $set_clause WHERE id=$user");
}

exit(json_encode(array(
  'success' => true,
)));
