<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('permissions.php');
require_once('message_lib.php');
require_once('user_lib.php');
require_once('thread_lib.php');

async_start();

if (!isset($_POST['thread']) || !isset($_POST['subscribe'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$thread = (int)$_POST['thread'];
$new_subscribed = $_POST['subscribe'] ? 1 : 0;
$viewer_id = get_viewer_id();

$message_infos = array();
$truncation_status = array();
$message_users = array();
if (viewer_is_member($thread)) {
  $query = <<<SQL
UPDATE roles
SET subscribed = {$new_subscribed}
WHERE thread = {$thread} AND user = {$viewer_id}
SQL;
  $conn->query($query);
} else {
  if (!check_thread_permission($thread, PERMISSION_JOIN_THREAD)) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }

  $roletype_results = change_roletype($thread, array($viewer_id), null);
  $to_save = $roletype_results['to_save'];
  $to_delete = $roletype_results['to_delete'];

  $to_save_with_subscribed = array();
  foreach ($to_save as $row_to_save) {
    if ($row_to_save['thread_id'] === $thread) {
      $row_to_save['subscribed'] = true;
    }
    $to_save_with_subscribed[] = $row_to_save;
  }

  save_user_roles($to_save_with_subscribed);
  delete_user_roles($to_delete);

  $message_info = array(
    'type' => MESSAGE_TYPE_JOIN_THREAD,
    'threadID' => (string)$thread,
    'creatorID' => (string)get_viewer_id(),
    'time' => round(microtime(true) * 1000), // in milliseconds
  );
  create_message_infos(array($message_info));

  $thread_selection_criteria = array("thread_ids" => array($thread => false));
  $message_result = get_message_infos(
    $thread_selection_criteria,
    DEFAULT_NUMBER_PER_THREAD
  );
  if (!$message_result) {
    async_end(array(
      'error' => 'internal_error',
    ));
  }
  list($message_infos, $truncation_status, $message_users) = $message_result;
}

list($thread_infos, $thread_users) = get_thread_infos();

$user_infos = combine_keyed_user_info_arrays(
  $message_users,
  $thread_users
);

async_end(array(
  'success' => true,
  'thread_infos' => $thread_infos,
  'message_infos' => $message_infos,
  'truncation_status' => $truncation_status,
  'user_infos' => $user_infos,
));
