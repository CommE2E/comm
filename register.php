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
if (isset($_COOKIE['user'])) {
  exit(json_encode(array(
    'error' => 'already_logged_in',
  )));
}

$username = $conn->real_escape_string($_POST['username']);
$password = $_POST['password'];
if (trim($password) === '') {
  exit(json_encode(array(
    'error' => 'empty_password',
  )));
}

$valid_username_regex = "/^[a-zA-Z0-9-_]+$/";
if (!preg_match($valid_username_regex, $username)) {
  exit(json_encode(array(
    'error' => 'invalid_username',
  )));
}

$result = $conn->query("SELECT id FROM users WHERE username = '$username'");
$user_row = $result->fetch_assoc();
if ($user_row) {
  exit(json_encode(array(
    'error' => 'username_taken',
  )));
}

$salt = md5(openssl_random_pseudo_bytes(32));
$hash = hash('sha512', $password.$salt);
$time = round(microtime(true) * 1000); // in milliseconds
$conn->query("INSERT INTO ids(table_name) VALUES('users')");
$id = $conn->insert_id;
$conn->query(
  "INSERT INTO users(id, username, salt, hash, creation_time) ".
    "VALUES ($id, '$username', UNHEX('$salt'), UNHEX('$hash'), $time)"
);

create_user_cookie($id);

exit(json_encode(array(
  'success' => true,
)));
