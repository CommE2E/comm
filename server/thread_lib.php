<?php

require_once('config.php');
require_once('auth.php');

define("VISIBILITY_OPEN", 0);
define("VISIBILITY_CLOSED", 1);
define("VISIBILITY_SECRET", 2);
define("VISIBILITY_NESTED_OPEN", 3);
define("VISIBILITY_THREAD_SECRET", 4);
define("EDIT_ANYBODY", 0);
define("EDIT_LOGGED_IN", 1);

function get_thread_infos($specific_condition="") {
  global $conn;

  $viewer_id = get_viewer_id();
  $role_successful_auth = ROLE_SUCCESSFUL_AUTH;
  $visibility_closed = VISIBILITY_CLOSED;
  $visibility_nested_open = VISIBILITY_NESTED_OPEN;
  $where_clause = $specific_condition ? "WHERE $specific_condition" : "";

  $query = <<<SQL
SELECT t.id, t.name, tr.role, t.visibility_rules, t.parent_thread_id,
  tr.subscribed, t.color, t.description, t.edit_rules, t.creation_time,
  t.concrete_ancestor_thread_id,
  (
    (
      t.visibility_rules >= {$visibility_closed} AND
      t.visibility_rules != {$visibility_nested_open} AND
      (tr.thread IS NULL OR tr.role < {$role_successful_auth})
    ) OR (
      t.visibility_rules = {$visibility_nested_open} AND
      a.visibility_rules >= {$visibility_closed} AND
      (ar.thread IS NULL OR ar.role < {$role_successful_auth})
    )
  ) AS requires_auth
FROM threads t
LEFT JOIN roles tr ON tr.thread = t.id AND tr.user = {$viewer_id}
LEFT JOIN threads a ON a.id = t.concrete_ancestor_thread_id
LEFT JOIN roles ar
  ON ar.thread = t.concrete_ancestor_thread_id AND ar.user = {$viewer_id}
{$where_clause}
SQL;
  $result = $conn->query($query);

  $thread_infos = array();
  while ($row = $result->fetch_assoc()) {
    $vis_rules = (int)$row['visibility_rules'];
    $authorized = !$row['requires_auth'];
    if (!$authorized && $vis_rules >= VISIBILITY_SECRET) {
      continue;
    }
    $subscribed_authorized = $authorized && $row['subscribed'];
    $thread_infos[$row['id']] = array(
      'id' => $row['id'],
      'name' => $row['name'],
      'description' => $row['description'],
      'authorized' => $authorized,
      'subscribed' => $subscribed_authorized,
      'parentThreadID' => $row['parent_thread_id'],
      'canChangeSettings' => (int)$row['role'] >= ROLE_CREATOR,
      'visibilityRules' => $vis_rules,
      'color' => $row['color'],
      'editRules' => (int)$row['edit_rules'],
      'creationTime' => (int)$row['creation_time'],
    );
  }
  return $thread_infos;
}

function fetch_concrete_ancestor_thread_id($parent_thread_id) {
  global $conn;

  $query = <<<SQL
SELECT concrete_ancestor_thread_id, visibility_rules
FROM threads
WHERE id = {$parent_thread_id}
SQL;
  $result = $conn->query($query);
  $row = $result->fetch_assoc();
  if (!$row) {
    return null;
  }

  $vis_rules = (int)$row['visibility_rules'];
  if (
    $vis_rules !== VISIBILITY_NESTED_OPEN &&
    $vis_rules !== VISIBILITY_THREAD_SECRET
  ) {
    return null;
  }

  return $row['concrete_ancestor_thread_id']
    ? (int)$row['concrete_ancestor_thread_id']
    : $parent_thread_id;
}
