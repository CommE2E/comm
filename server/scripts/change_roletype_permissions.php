<?php

require_once('../config.php');
require_once('../permissions.php');

echo "Querying for thread family tree...\n";

$query = <<<SQL
SELECT r.id, r.thread, t.parent_thread_id
FROM roles r
LEFT JOIN threads t ON t.id = r.thread
WHERE r.name = 'Admins'
SQL;
$results = $conn->query($query);

$parents_to_children = array();
$children_to_parents = array();
$threads_to_admin_role = array();
while ($row = $results->fetch_assoc()) {
  $role = (int)$row['id'];
  $thread_id = (int)$row['thread'];
  $threads_to_admin_role[$thread_id] = $role;

  if ($row['parent_thread_id']) {
    $parent_thread_id = (int)$row['parent_thread_id'];
    $children_to_parents[$thread_id] = $parent_thread_id;
    if (!isset($parents_to_children[$parent_thread_id])) {
      $parents_to_children[$parent_thread_id] = array();
    }
    $parents_to_children[$parent_thread_id][$thread_id] = $thread_id;
  }

  if (!isset($parents_to_children[$thread_id])) {
    $parents_to_children[$thread_id] = array();
  }
}
echo "Total thread count: " . count($parents_to_children) . "\n";

$new_permissions = array(
  PERMISSION_PREFIX_DESCENDANT . PERMISSION_VOICED => false,
);

while ($parents_to_children) {
  // Select just the threads whose children have already been processed
  $current_threads = array_keys(array_filter(
    $parents_to_children,
    function($children) { return !$children; }
  ));
  echo "This round's leaf nodes: " . print_r($current_threads, true);

  $to_save = array();
  $to_delete = array();
  foreach ($current_threads as $thread_id) {
    $admin_role = $threads_to_admin_role[$thread_id];
    $results = edit_role_permissions($admin_role, $new_permissions);
    $to_save = array_merge($to_save, $results['to_save']);
    $to_delete = array_merge($to_delete, $results['to_delete']);
  }
  save_memberships($to_save);
  delete_memberships($to_delete);

  $parents_to_children = array_filter($parents_to_children);
  foreach ($current_threads as $thread_id) {
    if (!isset($children_to_parents[$thread_id])) {
      continue;
    }
    $parent_id = $children_to_parents[$thread_id];
    unset($parents_to_children[$parent_id][$thread_id]);
  }
}
