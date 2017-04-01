<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('calendar_lib.php');

async_start();

$viewer_id = get_viewer_id();
$user_logged_in = user_logged_in();

$user_info = null;
if ($user_logged_in) {
  $result = $conn->query(
    "SELECT username, email, email_verified FROM users WHERE id = $viewer_id"
  );
  $user_row = $result->fetch_assoc();
  if (!$user_row) {
    async_end(array(
      'error' => 'unknown_error',
    ));
  }
  $user_info = array(
    'username' => $user_row['username'],
    'email' => $user_row['email'],
    'email_verified' => (bool)$user_row['email_verified'],
  );
}

async_end(array(
  'user_info' => $user_info,
  'calendar_infos' => get_calendar_infos(),
));
