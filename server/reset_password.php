<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('verify_lib.php');

async_start();

if (!isset($_POST['password']) || !isset($_POST['code'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$password = $_POST['password'];
if (trim($password) === '') {
  async_end(array(
    'error' => 'empty_password',
  ));
}

$code = $_POST['code'];
$verification_result = verify_code($code);
if (!$verification_result) {
  async_end(array(
    'error' => 'invalid_code',
  ));
}

list($user, $field) = $verification_result;
if ($field !== VERIFY_FIELD_RESET_PASSWORD) {
  async_end(array(
    'error' => 'invalid_code',
  ));
}

$result = $conn->query(
  "SELECT username, email, email_verified FROM users WHERE id = $user"
);
$user_row = $result->fetch_assoc();
if (!$user_row) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$hash = password_hash($password, PASSWORD_BCRYPT);
$conn->query("UPDATE users SET hash = '$hash' WHERE id = $user");

create_user_cookie($user);

clear_verify_codes($user, VERIFY_FIELD_RESET_PASSWORD);

async_end(array(
  'success' => true,
  'username' => $user_row['username'],
  'email' => $user_row['email'],
  'email_verified' => (bool)$user_row['email_verified'],
));
