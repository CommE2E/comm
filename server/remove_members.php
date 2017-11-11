<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('user_lib.php');
require_once('permissions.php');
require_once('thread_lib.php');
require_once('message_lib.php');

async_start();

if (!isset($_POST['thread']) || !isset($_POST['member_ids'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$thread = (int)$_POST['thread'];
$member_ids = verify_user_ids($_POST['member_ids']);

if (
  !$member_ids ||
  !check_thread_permission($thread, PERMISSION_REMOVE_MEMBERS)
) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

$viewer_id = get_viewer_id();
if (in_array($viewer_id, $member_ids)) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$member_sql_string = implode(", ", $member_ids);
$query = <<<SQL
SELECT r.user, r.roletype, t.default_roletype
FROM roles r
LEFT JOIN threads t ON t.id = r.thread
WHERE r.user IN ({$member_sql_string}) AND r.thread = {$thread}
SQL;
$result = $conn->query($query);

$non_default_roletype_user = false;
$actual_member_ids = array();
while ($row = $result->fetch_assoc()) {
  if (!$row['roletype']) {
    continue;
  }
  $actual_member_ids[] = (int)$row['user'];
  if ($row['roletype'] !== $row['default_roletype']) {
    $non_default_roletype_user = true;
  }
}

if (
  $non_default_roletype_user &&
  !check_thread_permission($thread, PERMISSION_CHANGE_ROLE)
) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

$results = change_roletype($thread, $actual_member_ids, 0);
save_user_roles($results['to_save']);
delete_user_roles($results['to_delete']);

$message_info = array(
  'type' => MESSAGE_TYPE_REMOVE_MEMBERS,
  'threadID' => (string)$thread,
  'creatorID' => (string)$viewer_id,
  'time' => round(microtime(true) * 1000), // in milliseconds
  'removedUserIDs' => array_map("strval", $actual_member_ids),
);
$new_message_infos = create_message_infos(array($message_info));

list($thread_infos) = get_thread_infos("t.id = {$thread}");
async_end(array(
  'success' => true,
  'thread_info' => $thread_infos[$thread],
  'new_message_infos' => $new_message_infos,
));
