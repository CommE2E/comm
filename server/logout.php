<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');

async_start();

if (isset($_COOKIE['user'])) {
  list($cookie_id, $cookie_password) = explode(':', $_COOKIE['user']);
  $cookie_id = intval($cookie_id);
  $result = $conn->query(
    "SELECT hash FROM cookies WHERE id = $cookie_id AND user IS NOT NULL"
  );
  $cookie_row = $result->fetch_assoc();
  if ($cookie_row && password_verify($cookie_password, $cookie_row['hash'])) {
    $conn->query("DELETE FROM cookies WHERE id = $cookie_id");
    $conn->query("DELETE FROM ids WHERE id = $cookie_id");
  }
}

delete_cookie('user');
init_anonymous_cookie();
$new_viewer_id = get_viewer_id();

async_end(array(
  'success' => true,
  'current_user_info' => array(
    'id' => (string)$new_viewer_id,
    'anonymous' => true,
  ),
));
