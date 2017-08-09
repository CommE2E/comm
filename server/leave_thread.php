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

$viewer_id = get_viewer_id();
$role_query = <<<SQL
SELECT t.visibility_rules, r.role
FROM threads t
LEFT JOIN roles r ON r.thread = t.id AND r.user = {$viewer_id}
WHERE t.id = {$thread}
SQL;
$role_result = $conn->query($role_query);
$role_row = $role_result->fetch_assoc();
if ($role_row === null || $role_row['role'] < ROLE_SUCCESSFUL_AUTH) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$vis_rules = (int)$role_row['visibility_rules'];

$roles_to_delete = array(array(
  "user" => $viewer_id,
  "thread" => $thread,
));
if ($vis_rules === VISIBILITY_NESTED_OPEN) {
  $current_tree_level = array($thread);
  $role_successful_auth = ROLE_SUCCESSFUL_AUTH;
  $visibility_nested_open = VISIBILITY_NESTED_OPEN;
  while ($current_tree_level) {
    $parent_sql_string = implode(", ", $current_tree_level);
    $children_query = <<<SQL
SELECT t.id
FROM threads t
LEFT JOIN roles r ON r.thread = t.id AND r.user = {$viewer_id}
WHERE r.role >= {$role_successful_auth} AND
  t.visibility_rules = {$visibility_nested_open} AND
  t.parent_thread_id IN ({$parent_sql_string})
SQL;
    $children_result = $conn->query($children_query);
    $current_tree_level = array();
    while ($children_row = $children_result->fetch_assoc()) {
      $child_thread_id = (int)$children_row['id'];
      $current_tree_level[] = $child_thread_id;
      $roles_to_delete[] = array(
        "user" => $viewer_id,
        "thread" => $child_thread_id,
      );
    }
  }
}

delete_user_roles($roles_to_delete);

async_end(array(
  'success' => true,
  'thread_infos' => get_thread_infos(),
));
