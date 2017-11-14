<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');
require_once('entry_lib.php');
require_once('message_lib.php');
require_once('user_lib.php');

async_start();

$user_info = get_user_info();
if ($user_info === null) {
  async_end(array(
    'error' => 'unknown_error',
  ));
}

if (
  !empty($_POST['inner_entry_query']) &&
  !verify_entry_info_query($_POST['inner_entry_query'])
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

list($thread_infos, $thread_users) = get_thread_infos();
$watched_ids = isset($_POST['watched_ids']) ? $_POST['watched_ids'] : null;

$time = round(microtime(true) * 1000); // in milliseconds
$message_users = array();
if (isset($_POST['last_ping']) && $_POST['last_ping']) {
  $last_ping = (int)$_POST['last_ping'];
  list($message_infos, $truncation_status, $message_users) =
    get_messages_since($last_ping, DEFAULT_NUMBER_PER_THREAD, $watched_ids);
} else {
  $input = null;
  if (is_array($watched_ids) && $watched_ids) {
    $input = array_fill_keys($watched_ids, false);
    foreach ($thread_infos as $thread_info) {
      if ($thread_info['currentUser']['role'] !== null) {
        $input[$thread_info['id']] = false;
      }
    }
  }
  list($message_infos, $truncation_status, $message_users) =
    get_message_infos($input, DEFAULT_NUMBER_PER_THREAD);
}

$return = array(
  'success' => true,
  'current_user_info' => $user_info,
  'thread_infos' => $thread_infos,
  'message_infos' => $message_infos,
  'truncation_status' => $truncation_status,
);

if (isset($_POST['last_ping'])) {
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
