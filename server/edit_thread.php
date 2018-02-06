<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');
require_once('user_lib.php');
require_once('message_lib.php');
require_once('permissions.php');

async_start();

if (!user_logged_in()) {
  async_end(array(
    'error' => 'not_logged_in',
  ));
}

if (!isset($_POST['thread'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$user = get_viewer_id();
$thread = (int)$_POST['thread'];

$changed_fields = array();
$changed_sql_fields = array();
if (isset($_POST['name'])) {
  $changed_fields['name'] = $_POST['name'];
  $changed_sql_fields['name'] =
    "'" . $conn->real_escape_string($_POST['name']) . "'";
}
if (isset($_POST['description'])) {
  $changed_fields['description'] = $_POST['description'];
  $changed_sql_fields['description'] =
    "'" . $conn->real_escape_string($_POST['description']) . "'";
}
if (isset($_POST['color'])) {
  $color = strtolower($_POST['color']);
  if (!preg_match('/^[a-f0-9]{6}$/', $color)) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
  $changed_fields['color'] = $color;
  $changed_sql_fields['color'] = "'" . $color . "'";
}

$new_password = null;
if (isset($_POST['new_password'])) {
  $new_password = $_POST['new_password'];
  if (trim($new_password) === '') {
    async_end(array(
      'error' => 'empty_password',
    ));
  }
  // We don't update $changed_fields here because we don't have
  // password-protected threads in the app yet, and I'm probably gonna remove
  // that feature from the website altogether.
  $changed_sql_fields['hash'] =
    "'" . password_hash($new_password, PASSWORD_BCRYPT) . "'";
}

$parent_thread_id = null;
if (isset($_POST['parent_thread_id'])) {
  $parent_thread_id = (int)$_POST['parent_thread_id'];
  if (
    !check_thread_permission($parent_thread_id, PERMISSION_CREATE_SUBTHREADS)
  ) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
  $changed_sql_fields['parent_thread_id'] = $parent_thread_id;
}

$vis_rules = null;
if (isset($_POST['visibility_rules'])) {
  $vis_rules = (int)$_POST['visibility_rules'];
  if ($vis_rules <= VISIBILITY_SECRET) {
    if ($parent_thread_id !== null) {
      async_end(array(
        'error' => 'invalid_parameters',
      ));
    }
    $changed_sql_fields['parent_thread_id'] = "NULL";
  }
  if ($vis_rules !== VISIBILITY_CLOSED && $vis_rules !== VISIBILITY_SECRET) {
    if ($new_password !== null) {
      async_end(array(
        'error' => 'invalid_parameters',
      ));
    }
    $changed_sql_fields['hash'] = "NULL";
  }
  $changed_sql_fields['visibility_rules'] = $vis_rules;
  $changed_fields['visibility_rules'] = $vis_rules;
}

$add_member_ids = isset($_POST['add_member_ids'])
  ? verify_user_ids($_POST['add_member_ids'])
  : array();

if (!$changed_sql_fields && !$add_member_ids) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

// Two unrelated purposes for this query:
// - get hash for viewer password check (users table)
// - figures out if the thread requires auth (threads table)
$query = <<<SQL
SELECT u.hash, t.visibility_rules, t.parent_thread_id
FROM users u
LEFT JOIN threads t ON t.id = {$thread}
WHERE u.id = {$user}
SQL;
$result = $conn->query($query);
$row = $result->fetch_assoc();
if (!$row || $row['visibility_rules'] === null) {
  async_end(array(
    'error' => 'internal_error',
  ));
}
$permission_info = fetch_thread_permission_info($thread);
if (
  (
    isset($changed_sql_fields['name']) ||
    isset($changed_sql_fields['description']) ||
    isset($changed_sql_fields['color'])
  ) && !permission_helper($permission_info, PERMISSION_EDIT_THREAD)
) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}
if (
  (
    isset($changed_sql_fields['parent_thread_id']) ||
    isset($changed_sql_fields['visibility_rules']) ||
    isset($changed_sql_fields['hash'])
  ) && (
    !permission_helper($permission_info, PERMISSION_EDIT_PERMISSIONS) ||
    (
      !isset($_POST['personal_password']) ||
      !password_verify($_POST['personal_password'], $row['hash'])
    )
  )
) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}
if (
  $add_member_ids &&
  !permission_helper($permission_info, PERMISSION_ADD_MEMBERS)
) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}
$old_vis_rules = (int)$row['visibility_rules'];
$old_parent_thread_id = $row['parent_thread_id'] !== null
  ? (int)$row['parent_thread_id']
  : null;

// If the thread is being switched to closed, then a password *must* be
// specified
if (
  $old_vis_rules !== VISIBILITY_CLOSED &&
  $old_vis_rules !== VISIBILITY_SECRET &&
  ($vis_rules === VISIBILITY_CLOSED || $vis_rules === VISIBILITY_SECRET) &&
  $new_password === null
) {
  async_end(array(
    'error' => 'empty_password',
  ));
}

// If the thread is being switched to nested, a parent must be specified
if (
  $old_vis_rules !== VISIBILITY_NESTED_OPEN &&
  $vis_rules === VISIBILITY_NESTED_OPEN &&
  $old_parent_thread_id === null &&
  $parent_thread_id === null
) {
  async_end(array(
    'error' => 'no_parent_thread_specified',
  ));
}

$next_vis_rules = $vis_rules !== null ? $vis_rules : $old_vis_rules;
$next_parent_thread_id = $parent_thread_id !== null
  ? $parent_thread_id
  : $old_parent_thread_id;

// It is not valid to set a parent thread ID on v1 visibilities
if ($next_vis_rules <= VISIBILITY_SECRET && $parent_thread_id !== null) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

// It is not valid to set a password on anything other than these visibilities
if (
  $next_vis_rules !== VISIBILITY_CLOSED &&
  $next_vis_rules !== VISIBILITY_SECRET &&
  $new_password !== null
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

if ($changed_sql_fields) {
  $sql_set_strings = array();
  foreach ($changed_sql_fields as $field_name => $field_sql_string) {
    $sql_set_strings[] = "{$field_name} = {$field_sql_string}";
  }
  $sql_set_string = implode(", ", $sql_set_strings);
  $conn->query("UPDATE threads SET {$sql_set_string} WHERE id = {$thread}");
}

$to_save = array();
$to_delete = array();
if (
  $next_vis_rules !== $old_vis_rules ||
  $next_parent_thread_id !== $old_parent_thread_id
) {
  $recalculate_results = recalculate_all_permissions($thread, $next_vis_rules);
  $to_save = array_merge($to_save, $recalculate_results['to_save']);
  $to_delete = array_merge($to_delete, $recalculate_results['to_delete']);
}
if ($add_member_ids) {
  $role_results = change_role($thread, $add_member_ids, null);
  if (!$role_results) {
    async_end(array(
      'error' => 'unknown_error',
    ));
  }
  foreach ($role_results['to_save'] as $row_to_save) {
    if ($row_to_save['role'] !== 0) {
      $row_to_save['unread'] = true;
    }
    if ($row_to_save['thread_id'] === $thread) {
      $row_to_save['subscription'] = array(
        "home" => true,
        "pushNotifs" => true,
      );
    }
    $to_save[] = $row_to_save;
  }
  $to_delete = array_merge($to_delete, $role_results['to_delete']);
}
save_memberships($to_save);
delete_memberships($to_delete);

$time = round(microtime(true) * 1000); // in milliseconds
$message_infos = array();
foreach ($changed_fields as $field_name => $new_value) {
  $message_infos[] = array(
    'type' => MESSAGE_TYPE_CHANGE_SETTINGS,
    'threadID' => (string)$thread,
    'creatorID' => (string)$user,
    'time' => $time,
    'field' => $field_name,
    'value' => $new_value,
  );
}
if ($add_member_ids) {
  $message_infos[] = array(
    'type' => MESSAGE_TYPE_ADD_MEMBERS,
    'threadID' => (string)$thread,
    'creatorID' => (string)$user,
    'time' => $time,
    'addedUserIDs' => array_map("strval", $add_member_ids),
  );
}
$new_message_infos = create_message_infos($message_infos);

list($thread_infos) = get_thread_infos("t.id = {$thread}");

async_end(array(
  'success' => true,
  'new_message_infos' => $new_message_infos,
  'thread_info' => $thread_infos[$thread],
));
