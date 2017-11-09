<?php

require_once('async_lib.php');
require_once('config.php');
require_once('user_lib.php');
require_once('permissions.php');
require_once('thread_lib.php');

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
SELECT user, roletype
FROM roles
WHERE user IN ({$member_sql_string}) AND thread = {$thread}
SQL;
$result = $conn->query($query);

$non_member_user = false;
$num_results = 0;
while ($row = $result->fetch_assoc()) {
  if (!$row['roletype']) {
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

$results = change_roletype($thread, $member_ids, $role);
save_user_roles($results['to_save']);
delete_user_roles($results['to_delete']);

list($thread_infos) = get_thread_infos("t.id = {$thread}");
async_end(array(
  'success' => true,
  'thread_info' => $thread_infos[$thread],
));
