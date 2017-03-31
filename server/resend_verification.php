<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('verify_lib.php');

async_start();

if (!user_logged_in()) {
  async_end(array(
    'error' => 'not_logged_in',
  ));
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
  async_end(array(
    'error' => 'already_verified',
  ));
}

verify_email($viewer_id, $username, $email);

async_end(array(
  'success' => true,
));
