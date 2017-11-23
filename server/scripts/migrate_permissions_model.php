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

  echo "Creating roles for {$thread_id}...\n";
  $roles = create_initial_roles_for_new_thread($thread_id);

  echo "Setting default role for {$thread_id}...\n";
  $query = <<<SQL
UPDATE threads
SET default_role = {$roles['members']['id']}
WHERE id = {$thread_id}
SQL;
  $conn->query($query);

  echo "Updating creator role for {$thread_id}...\n";
  $creator = (int)$row['creator'];
  $query = <<<SQL
UPDATE memberships
SET role = {$roles['admins']['id']}
WHERE thread = {$thread_id} AND user = {$creator}
SQL;
  $conn->query($query);

  echo "Updating all other roles for {$thread_id}...\n";
  $query = <<<SQL
UPDATE memberships
SET role = {$roles['members']['id']}
WHERE thread = {$thread_id} AND user != {$creator}
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
    echo "Saving batch of {$total} memberships...\n";
    save_memberships($to_save);
    delete_memberships($to_delete);
    $to_save = array();
    $to_delete = array();
  }
}
$total = count($to_save) + count($to_delete);
if ($total) {
  echo "Saving batch of {$total} memberships...\n";
  save_memberships($to_save);
  delete_memberships($to_delete);
}
