<?php

require_once('../config.php');
require_once('../permissions.php');

echo "Querying for threads...\n";

$query = <<<SQL
SELECT id, creator, visibility_rules, parent_thread_id FROM threads
SQL;
$thread_results = $conn->query($query);

$root_threads = array();
while ($row = $thread_results->fetch_assoc()) {
  $thread_id = (int)$row['id'];

  echo "Creating roletypes for {$thread_id}...\n";
  $roletypes = create_initial_roletypes_for_new_thread($thread_id);

  echo "Setting default roletype for {$thread_id}...\n";
  $query = <<<SQL
UPDATE threads
SET default_roletype = {$roletypes['member_roletype_id']}
WHERE id = {$thread_id}
SQL;
  $conn->query($query);

  echo "Updating creator roletype for {$thread_id}...\n";
  $creator = (int)$row['creator'];
  $query = <<<SQL
UPDATE roles
SET roletype = {$roletypes['creator_roletype_id']}
WHERE thread = {$thread_id} AND user = {$creator}
SQL;
  $conn->query($query);

  echo "Updating all other roles for {$thread_id}...\n";
  $query = <<<SQL
UPDATE roles
SET roletype = {$roletypes['member_roletype_id']}
WHERE thread = {$thread_id} AND role = 5
SQL;
  $conn->query($query);

  if ($row['parent_thread_id'] === null) {
    $vis_rules = (int)$row['visibility_rules'];
    $root_threads[$thread_id] = $vis_rules;
  }
}

$batch_size = 500;
$to_save = array();
$to_delete = array();
foreach ($root_threads as $thread_id => $vis_rules) {
  echo "Recalculating permissions for {$thread_id} and all descendants...\n";
  $recalculate_results = recalculate_all_permissions($thread_id, $vis_rules);
  $to_save = array_merge($to_save, $recalculate_results['to_save']);
  $to_delete = array_merge($to_delete, $recalculate_results['to_delete']);
  $total = count($to_save) + count($to_delete);
  if ($total >= $batch_size) {
    echo "Saving batch of {$total} roles...\n";
    save_user_roles($to_save);
    delete_user_roles($to_delete);
    $to_save = array();
    $to_delete = array();
  }
}
$total = count($to_save) + count($to_delete);
if ($total) {
  echo "Saving batch of {$total} roles...\n";
  save_user_roles($to_save);
  delete_user_roles($to_delete);
}
