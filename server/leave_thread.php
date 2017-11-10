<?php

require_once('async_lib.php');
require_once('auth.php');
require_once('thread_lib.php');
require_once('permissions.php');
require_once('message_lib.php');

async_start();

if (!isset($_POST['thread'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$thread = intval($_POST['thread']);

if (!viewer_is_member($thread)) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$leave_results = change_roletype($thread, array(get_viewer_id()), 0);
if (!$leave_results) {
  async_end(array(
    'error' => 'unknown_error',
  ));
}
$to_save = array();
foreach ($leave_results['to_save'] as $row_to_save) {
  $row_to_save['subscribed'] = false;
  $to_save[] = $row_to_save;
}
save_user_roles($to_save);
delete_user_roles($leave_results['to_delete']);

$message_info = array(
  'type' => MESSAGE_TYPE_LEAVE_THREAD,
  'threadID' => (string)$thread,
  'creatorID' => (string)get_viewer_id(),
  'time' => round(microtime(true) * 1000), // in milliseconds
);
create_message_infos(array($message_info));

list($thread_infos) = get_thread_infos();
async_end(array(
  'success' => true,
  'thread_infos' => $thread_infos,
));
