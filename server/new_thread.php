<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');
require_once('user_lib.php');

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
}

$parent_thread_id = null;
if (isset($_POST['parent_thread_id'])) {
  if ($vis_rules <= VISIBILITY_SECRET) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
  $parent_thread_id = intval($_POST['parent_thread_id']);
  if (!viewer_can_edit_thread($parent_thread_id)) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
}

$concrete_ancestor_thread_id = null;
if ($vis_rules === VISIBILITY_NESTED_OPEN) {
  if ($parent_thread_id === null) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
  $concrete_ancestor_thread_id =
    fetch_concrete_ancestor_thread_id($parent_thread_id);
  if ($concrete_ancestor_thread_id === null) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
}

$name = $conn->real_escape_string($_POST['name']);
$description = $conn->real_escape_string($_POST['description']);
$time = round(microtime(true) * 1000); // in milliseconds
$conn->query("INSERT INTO ids(table_name) VALUES('threads')");
$id = $conn->insert_id;
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
$concrete_ancestor_thread_id_sql_string = $concrete_ancestor_thread_id
  ? $concrete_ancestor_thread_id
  : "NULL";

$thread_insert_sql = <<<SQL
INSERT INTO threads
  (id, name, description, visibility_rules, hash, edit_rules, creator,
  creation_time, color, parent_thread_id, concrete_ancestor_thread_id)
VALUES
  ($id, '$name', '$description', $vis_rules, $hash_sql_string, $edit_rules,
  $creator, $time, '$color', $parent_thread_id_sql_string,
  $concrete_ancestor_thread_id_sql_string)
SQL;
$conn->query($thread_insert_sql);

$conn->query("INSERT INTO ids(table_name) VALUES('messages')");
$message_id = $conn->insert_id;
$conn->query(
  "INSERT INTO messages(id, thread, user, type, time) ".
    "VALUES ($message_id, $id, $creator, 1, $time)"
);

$roles_to_save = array(array(
  "user" => $creator,
  "thread" => $id,
  "role" => ROLE_CREATOR,
  "creation_time" => $time,
  "last_view" => $time,
  "subscribed" => true,
));
$initial_member_ids = isset($_POST['initial_member_ids'])
  ? verify_user_ids($_POST['initial_member_ids'])
  : array();
foreach ($initial_member_ids as $initial_member_id) {
  $roles_to_save[] = array(
    "user" => $initial_member_id,
    "thread" => $id,
    "role" => ROLE_SUCCESSFUL_AUTH,
    "creation_time" => $time,
    "last_view" => $time,
    "subscribed" => true,
  );
}
create_user_roles($roles_to_save);

async_end(array(
  'success' => true,
  'new_thread_id' => $id,
  'creation_time' => $time,
));
