<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');
require_once('entry_lib.php');
require_once('message_lib.php');

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
    'id' => (string)$viewer_id,
    'username' => $user_row['username'],
    'email' => $user_row['email'],
    'email_verified' => (bool)$user_row['email_verified'],
  );
}

$time = round(microtime(true) * 1000); // in milliseconds
if (isset($_REQUEST['last_ping']) && $_REQUEST['last_ping']) {
  $last_ping = (int)$_REQUEST['last_ping'];
  list($message_infos, $truncation_status, $users) =
    get_messages_since($last_ping, DEFAULT_NUMBER_PER_THREAD);
} else {
  list($message_infos, $truncation_status, $users) =
    get_message_infos(null, DEFAULT_NUMBER_PER_THREAD);
}

$return = array(
  'success' => true,
  'user_info' => $user_info,
  'thread_infos' => get_thread_infos(),
  'message_infos' => $message_infos,
  'truncation_status' => $truncation_status,
  'users' => array_values($users),
);

if (isset($_REQUEST['last_ping'])) {
  $return['server_time'] = $time;
}

if (!empty($_POST['inner_entry_query'])) {
  $entries = get_entry_infos($_POST['inner_entry_query']);
  if ($entries !== null) {
    $return['entries'] = $entries;
  }
}

async_end($return);
