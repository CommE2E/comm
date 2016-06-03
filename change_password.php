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
if (!isset($_POST['old_password']) || !isset($_POST['new_password'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

$user = get_viewer_id();
$old_password = $_POST['old_password'];
$new_password = $_POST['new_password'];
if (trim($new_password) === '') {
  exit(json_encode(array(
    'error' => 'empty_password',
  )));
}

$result = $conn->query(
  "SELECT LOWER(HEX(salt)) AS salt, LOWER(HEX(hash)) AS hash ".
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

$salt = md5(openssl_random_pseudo_bytes(32));
$hash = hash('sha512', $new_password.$salt);

$conn->query(
  "UPDATE users SET salt=UNHEX('$salt'), hash=UNHEX('$hash') WHERE id=$user"
);

exit(json_encode(array(
  'success' => true,
)));
