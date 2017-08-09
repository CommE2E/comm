<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');
require_once('message_lib.php');

async_start();

if (!isset($_POST['thread'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$thread = intval($_POST['thread']);

$thread_query = <<<SQL
SELECT visibility_rules, hash, parent_thread_id FROM threads WHERE id={$thread}
SQL;
$thread_result = $conn->query($thread_query);
$thread_row = $thread_result->fetch_assoc();
if (!$thread_row) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$viewer_id = get_viewer_id();
$vis_rules = (int)$thread_row['visibility_rules'];
$parent_thread_id = (int)$thread_row['parent_thread_id'];

$roles_to_save = array();
$message_cursors_to_query = array();
if ($vis_rules === VISIBILITY_OPEN) {
  $roles_to_save[] = array(
    "user" => $viewer_id,
    "thread" => $thread,
    "role" => ROLE_SUCCESSFUL_AUTH,
  );
  $message_cursors_to_query[$thread] = false;
} else if ($vis_rules === VISIBILITY_CLOSED || $vis_rules === VISIBILITY_SECRET) {
  // You can be added to these visibility types if you know the password
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
  $roles_to_save[] = array(
    "user" => $viewer_id,
    "thread" => $thread,
    "role" => ROLE_SUCCESSFUL_AUTH,
  );
  $message_cursors_to_query[$thread] = false;
} else if ($vis_rules === VISIBILITY_NESTED_OPEN) {
  $can_see = viewer_can_see_thread($thread);
  if ($can_see === null) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
  if (!$can_see) {
    async_end(array(
      'error' => 'invalid_credentials',
    ));
  }
  $roles_to_save[] = array(
    "user" => $viewer_id,
    "thread" => $thread,
    "role" => ROLE_SUCCESSFUL_AUTH,
  );
  $message_cursors_to_query[$thread] = false;
  $current_thread_id = $parent_thread_id;
  while (true) {
    $ancestor_query = <<<SQL
SELECT t.parent_thread_id, t.visibility_rules, r.role
FROM threads t
LEFT JOIN roles p ON p.thread = t.id AND p.user = {$viewer_id}
WHERE t.id = {$current_thread_id}
SQL;
    $ancestor_result = $conn->query($ancestor_query);
    $ancestor_row = $ancestor_result->fetch_assoc();
    if (
      (int)$ancestor_row['visibility_rules'] !== VISIBILITY_NESTED_OPEN ||
      (int)$ancestor_row['role'] >= ROLE_SUCCESSFUL_AUTH
    ) {
      break;
    }
    $roles_to_save[] = array(
      "user" => $viewer_id,
      "thread" => $current_thread_id,
      "role" => ROLE_SUCCESSFUL_AUTH,
      "subscribed" => false,
    );
    $message_cursors_to_query[$current_thread_id] = false;
    $current_thread_id = (int)$ancestor_row['parent_thread_id'];
  }
} else if ($vis_rules === VISIBILITY_THREAD_SECRET) {
  // There's no way to add yourself to a secret thread; you need to be added by
  // an existing member
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

create_user_roles($roles_to_save);

list($message_infos, $truncation_status, $users) =
  get_message_infos($message_cursors_to_query, DEFAULT_NUMBER_PER_THREAD);

async_end(array(
  'success' => true,
  'thread_infos' => get_thread_infos(),
  'message_infos' => $message_infos,
  'truncation_status' => $truncation_status,
  'user_infos' => array_values($users),
));
