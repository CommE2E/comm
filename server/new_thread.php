<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');
require_once('user_lib.php');
require_once('message_lib.php');
require_once('permissions.php');

async_start();

if (
  !isset($_POST['name']) ||
  !isset($_POST['description']) ||
  !isset($_POST['visibility_rules']) ||
  !isset($_POST['color'])
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$color = strtolower($_POST['color']);
if (!preg_match('/^[a-f0-9]{6}$/', $color)) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

if (!user_logged_in()) {
  async_end(array(
    'error' => 'not_logged_in',
  ));
}

$vis_rules = intval($_POST['visibility_rules']);
$password = null;
if ($vis_rules === VISIBILITY_CLOSED || $vis_rules === VISIBILITY_SECRET) {
  if (!isset($_POST['password'])) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
  $password = $_POST['password'];
} else if ($vis_rules === VISIBILITY_NESTED_OPEN) {
  if (!isset($_POST['parent_thread_id'])) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
}

$parent_thread_id = null;
if (isset($_POST['parent_thread_id'])) {
  if ($vis_rules <= VISIBILITY_SECRET) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
  $parent_thread_id = intval($_POST['parent_thread_id']);
  if (
    !check_thread_permission($parent_thread_id, PERMISSION_CREATE_SUBTHREADS)
  ) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
}

$conn->query("INSERT INTO ids(table_name) VALUES('threads')");
$id = $conn->insert_id;
$roles = create_initial_roles_for_new_thread($id);

$raw_name = $_POST['name'];
$raw_description = $_POST['description'];
$name = $conn->real_escape_string($raw_name);
$description = $conn->real_escape_string($raw_description);
$time = round(microtime(true) * 1000); // in milliseconds
$creator = get_viewer_id();
$edit_rules = $vis_rules >= VISIBILITY_CLOSED
  ? EDIT_LOGGED_IN
  : EDIT_ANYBODY;
$hash_sql_string =
  ($vis_rules === VISIBILITY_CLOSED || $vis_rules === VISIBILITY_SECRET)
  ? ("'" . password_hash($password, PASSWORD_BCRYPT) . "'")
  : "NULL";
$parent_thread_id_sql_string = $parent_thread_id
  ? $parent_thread_id
  : "NULL";

$default_role = $roles['members']['id'];
$thread_insert_sql = <<<SQL
INSERT INTO threads
  (id, name, description, visibility_rules, hash, edit_rules, creator,
  creation_time, color, parent_thread_id, default_role)
VALUES
  ($id, '$name', '$description', $vis_rules, $hash_sql_string, $edit_rules,
  $creator, $time, '$color', $parent_thread_id_sql_string, {$default_role})
SQL;
$conn->query($thread_insert_sql);

$initial_member_ids = isset($_POST['initial_member_ids'])
  ? verify_user_ids($_POST['initial_member_ids'])
  : array();

$message_infos = array(array(
  'type' => MESSAGE_TYPE_CREATE_THREAD,
  'threadID' => (string)$id,
  'creatorID' => (string)$creator,
  'time' => $time,
  'initialThreadState' => array(
    'name' => $raw_name,
    'parentThreadID' => $parent_thread_id ? (string)$parent_thread_id : null,
    'visibilityRules' => $vis_rules,
    'color' => $color,
    'memberIDs' => array_map("strval", $initial_member_ids),
  ),
));
if ($parent_thread_id) {
  $message_infos[] = array(
    'type' => MESSAGE_TYPE_CREATE_SUB_THREAD,
    'threadID' => (string)$parent_thread_id,
    'creatorID' => (string)$creator,
    'time' => $time,
    'childThreadID' => (string)$id,
  );
}
$new_message_infos = create_message_infos($message_infos);

$creator_results = change_role(
  $id,
  array($creator),
  (int)$roles['admins']['id']
);
if (!$creator_results) {
  async_end(array(
    'error' => 'unknown_error',
  ));
}
$to_save = $creator_results['to_save'];
$to_delete = $creator_results['to_delete'];
if ($initial_member_ids) {
  $initial_member_results = change_role($id, $initial_member_ids, null);
  if (!$initial_member_results) {
    async_end(array(
      'error' => 'unknown_error',
    ));
  }
  $to_save = array_merge($to_save, $initial_member_results['to_save']);
  $to_delete = array_merge($to_delete, $initial_member_results['to_delete']);
}

$processed_to_save = array();
$members = array();
$current_user_info = null;
foreach ($to_save as $row_to_save) {
  if (
    $row_to_save['role'] !== 0 &&
    ($row_to_save['user_id'] !== $creator ||
      $row_to_save['thread_id'] !== $id)
  ) {
    $row_to_save['unread'] = true;
  }
  if ($row_to_save['thread_id'] === $id && $row_to_save['role'] !== 0) {
    $row_to_save['subscribed'] = true;
    $member = array(
      "id" => (string)$row_to_save['user_id'],
      "permissions" => get_all_thread_permissions(
        array(
          "permissions" => $row_to_save['permissions'],
          "visibility_rules" => $vis_rules,
          "edit_rules" => $edit_rules,
        ),
        $id
      ),
      "role" => (string)$row_to_save['role'],
    );
    array_unshift($members, $member);
    if ($row_to_save['user_id'] === $creator) {
      $current_user_info = array(
        "permissions" => $member['permissions'],
        "role" => $member['role'],
        "subscribed" => true,
        "unread" => false,
      );
    }
  }
  $processed_to_save[] = $row_to_save;
}
save_memberships($processed_to_save);
delete_memberships($to_delete);

async_end(array(
  'success' => true,
  'new_thread_info' => array(
    'id' => (string)$id,
    'name' => $raw_name,
    'description' => $raw_description,
    'visibilityRules' => $vis_rules,
    'color' => $color,
    'editRules' => $edit_rules,
    'creationTime' => $time,
    'parentThreadID' => $parent_thread_id !== null
      ? (string)$parent_thread_id
      : null,
    'members' => $members,
    'roles' => array(
      $roles['members']['id'] => $roles['members'],
      $roles['admins']['id'] => $roles['admins'],
    ),
    'currentUser' => $current_user_info,
  ),
  'new_message_infos' => $new_message_infos,
));
