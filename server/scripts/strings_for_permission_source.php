<?php

require_once('../config.php');

$fetch_query = <<<SQL
SELECT user, thread, permissions, permissions_for_children
FROM memberships
SQL;

$fetch_results = $conn->query($fetch_query);
while ($row = $fetch_results->fetch_assoc()) {
  $permissions = json_decode($row['permissions'], true);
  $permissions_for_children =
    json_decode($row['permissions_for_children'], true);
  foreach ($permissions as $key => $permission) {
    $permissions[$key]['source'] = (string)$permission['source'];
  }
  foreach ($permissions_for_children as $key => $permission) {
    $permissions_for_children[$key]['source'] = (string)$permission['source'];
  }
  $save_permissions = $conn->real_escape_string(json_encode($permissions));
  $save_permissions_for_children =
    $conn->real_escape_string(json_encode($permissions_for_children));

  $update_query = <<<SQL
UPDATE memberships
SET permissions = '{$save_permissions}',
  permissions_for_children = '{$save_permissions_for_children}'
WHERE user = {$row['user']} AND thread = {$row['thread']}
SQL;
  $conn->query($update_query);
}
