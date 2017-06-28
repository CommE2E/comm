<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');
require_once('message_lib.php');

async_start();

if (!isset($_POST['thread'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$thread = intval($_POST['thread']);

// First, let's fetch the thread row and see if it needs authentication
$result = $conn->query("SELECT hash FROM threads WHERE id=$thread");
$thread_row = $result->fetch_assoc();
if (!$thread_row) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
if ($thread_row['hash'] === null) {
  async_end(array(
    'success' => true,
  ));
}

// The thread needs authentication, so we need to validate credentials
if (!isset($_POST['password'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
if (!password_verify($_POST['password'], $thread_row['hash'])) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

$viewer_id = get_viewer_id();

$time = round(microtime(true) * 1000); // in milliseconds
$conn->query(
  "INSERT INTO roles(thread, user, ".
    "creation_time, last_view, role, subscribed) ".
    "VALUES ($thread, $viewer_id, $time, $time, ".
    ROLE_SUCCESSFUL_AUTH.", 0) ON DUPLICATE KEY UPDATE ".
    "creation_time = LEAST(VALUES(creation_time), creation_time), ".
    "last_view = GREATEST(VALUES(last_view), last_view), ".
    "role = GREATEST(VALUES(role), role)"
);

list($message_infos, $truncation_status, $users) =
  get_message_infos(array($thread => false), DEFAULT_NUMBER_PER_THREAD);

$thread_infos = get_thread_infos("c.id = $thread");
async_end(array(
  'success' => true,
  'thread_info' => $thread_infos[$thread],
  'message_infos' => $message_infos,
  'truncation_status' => $truncation_status[$thread],
  'users' => $users,
));
