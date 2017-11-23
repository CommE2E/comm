<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('user_lib.php');
require_once('permissions.php');
require_once('thread_lib.php');
require_once('message_lib.php');

async_start();

if (
  !isset($_POST['thread']) ||
  !isset($_POST['member_ids']) ||
  !isset($_POST['role']) ||
  !$_POST['role']
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$thread = (int)$_POST['thread'];
$member_ids = verify_user_ids($_POST['member_ids']);
$role = (int)$_POST['role'];

if (
  !$member_ids ||
  !$role ||
  !check_thread_permission($thread, PERMISSION_CHANGE_ROLE)
) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

$member_sql_string = implode(", ", $member_ids);
$query = <<<SQL
SELECT user, role
FROM memberships
WHERE user IN ({$member_sql_string}) AND thread = {$thread}
SQL;
$result = $conn->query($query);

$non_member_user = false;
$num_results = 0;
while ($row = $result->fetch_assoc()) {
  if (!$row['role']) {
    $non_member_user = true;
    break;
  }
  $num_results++;
}

if ($non_member_user || $num_results < count($member_ids)) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$results = change_role($thread, $member_ids, $role);
save_memberships($results['to_save']);
delete_memberships($results['to_delete']);

$message_info = array(
  'type' => MESSAGE_TYPE_CHANGE_ROLE,
  'threadID' => (string)$thread,
  'creatorID' => (string)get_viewer_id(),
  'time' => round(microtime(true) * 1000), // in milliseconds
  'userIDs' => array_map("strval", $member_ids),
  'newRole' => (string)$role,
);
$new_message_infos = create_message_infos(array($message_info));

list($thread_infos) = get_thread_infos("t.id = {$thread}");
async_end(array(
  'success' => true,
  'thread_info' => $thread_infos[$thread],
  'new_message_infos' => $new_message_infos,
));
