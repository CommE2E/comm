<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');

async_start();

if (!user_logged_in()) {
  async_end(array(
    'error' => 'not_logged_in',
  ));
}
if (!isset($_POST['password'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$user = get_viewer_id();
$password = $_POST['password'];

$result = $conn->query("SELECT hash FROM users WHERE id = $user");
$user_row = $result->fetch_assoc();
if (!$user_row) {
  async_end(array(
    'error' => 'internal_error',
  ));
}
if (!password_verify($password, $user_row['hash'])) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

$query = <<<SQL
DELETE u, iu, v, iv, c, ic, m
FROM users u
LEFT JOIN ids iu ON iu.id = u.id
LEFT JOIN verifications v ON v.user = u.id
LEFT JOIN ids iv ON iv.id = v.id
LEFT JOIN cookies c ON c.user = u.id
LEFT JOIN ids ic ON ic.id = c.id
LEFT JOIN memberships m ON m.user = u.id
WHERE u.id = {$user}
SQL;
$conn->query($query);

// TODO figure out what to do with threads this account admins

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
