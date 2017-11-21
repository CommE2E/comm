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

$current_as_of = round(microtime(true) * 1000); // in milliseconds
$watched_ids = !empty($_POST['watched_ids']) && is_array($_POST['watched_ids'])
  ? $_POST['watched_ids']
  : array();
$thread_selection_criteria = array(
  "joined_threads" => true,
  "thread_ids" => array_fill_keys($watched_ids, false),
);

$message_users = array();
if (isset($_POST['last_ping']) && $_POST['last_ping']) {
  $last_ping = (int)$_POST['last_ping'];
  $result = get_messages_since(
    $thread_selection_criteria,
    $last_ping,
    DEFAULT_NUMBER_PER_THREAD
  );
} else {
  $result = get_message_infos(
    $thread_selection_criteria,
    DEFAULT_NUMBER_PER_THREAD
  );
}
if (!$result) {
  async_end(array(
    'error' => 'internal_error',
  ));
}
list($message_infos, $truncation_status, $message_users) = $result;

list($thread_infos, $thread_users) = get_thread_infos();

$return = array(
  'success' => true,
  'current_user_info' => $user_info,
  'thread_infos' => $thread_infos,
  'message_infos' => $message_infos,
  'truncation_status' => $truncation_status,
);

if (isset($_POST['last_ping'])) {
  $return['server_time'] = $current_as_of;
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
