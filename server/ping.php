<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');
require_once('entry_lib.php');
require_once('message_lib.php');
require_once('user_lib.php');

async_start();

$viewer_id = get_viewer_id();
$user_logged_in = user_logged_in();

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
} else {
  $user_info = array(
    'id' => (string)$viewer_id,
    'anonymous' => true,
  );
}

if (
  !empty($_POST['inner_entry_query']) &&
  !verify_entry_info_query($_POST['inner_entry_query'])
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$time = round(microtime(true) * 1000); // in milliseconds
$message_users = array();
if (isset($_REQUEST['last_ping']) && $_REQUEST['last_ping']) {
  $last_ping = (int)$_REQUEST['last_ping'];
  list($message_infos, $truncation_status, $message_users) =
    get_messages_since($last_ping, DEFAULT_NUMBER_PER_THREAD);
} else {
  list($message_infos, $truncation_status, $message_users) =
    get_message_infos(null, DEFAULT_NUMBER_PER_THREAD);
}

list($thread_infos, $thread_users) = get_thread_infos();

$return = array(
  'success' => true,
  'current_user_info' => $user_info,
  'thread_infos' => $thread_infos,
  'message_infos' => $message_infos,
  'truncation_status' => $truncation_status,
);

if (isset($_REQUEST['last_ping'])) {
  $return['server_time'] = $time;
}

$entry_users = array();
if (!empty($_POST['inner_entry_query'])) {
  $entry_result = get_entry_infos($_POST['inner_entry_query']);
  if ($entry_result !== null) {
    list($entries, $entry_users) = $entry_result;
    $return['entry_infos'] = $entries;
  }
}

$return['user_infos'] = combine_keyed_user_info_arrays(
  $message_users,
  $entry_users,
  $thread_users
);

async_end($return);
