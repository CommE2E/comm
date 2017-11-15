<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');
require_once('message_lib.php');
require_once('user_lib.php');
require_once('permissions.php');

async_start();

if (!isset($_POST['thread'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$thread = intval($_POST['thread']);
if (
  viewer_is_member($thread) ||
  !check_thread_permission($thread, PERMISSION_JOIN_THREAD)
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$thread_query = <<<SQL
SELECT visibility_rules, hash FROM threads WHERE id={$thread}
SQL;
$thread_result = $conn->query($thread_query);
$thread_row = $thread_result->fetch_assoc();
if (!$thread_row) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$vis_rules = (int)$thread_row['visibility_rules'];
if ($vis_rules === VISIBILITY_CLOSED || $vis_rules === VISIBILITY_SECRET) {
  // You can only be added to these visibility types if you know the password
  if ($thread_row['hash'] === null) {
    async_end(array(
      'error' => 'database_corruption',
    ));
  }
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
}

$join_results = change_roletype($thread, array(get_viewer_id()), null);
if (!$join_results) {
  async_end(array(
    'error' => 'unknown_error',
  ));
}
$to_save = array();
foreach ($join_results['to_save'] as $row_to_save) {
  $row_to_save['subscribed'] = true;
  $to_save[] = $row_to_save;
}
save_user_roles($to_save);
delete_user_roles($join_results['to_delete']);

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
