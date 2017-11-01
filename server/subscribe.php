<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('permissions.php');

async_start();

if (!isset($_POST['thread']) || !isset($_POST['subscribe'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$thread = (int)$_POST['thread'];
$new_subscribed = $_POST['subscribe'] ? 1 : 0;
$viewer_id = get_viewer_id();

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
}

async_end(array(
  'success' => true,
));
