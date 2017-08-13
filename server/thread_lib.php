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
  $thread_ids = array();
  while ($row = $result->fetch_assoc()) {
    $vis_rules = (int)$row['visibility_rules'];
    $authorized = !$row['requires_auth'];
    if (!$authorized && $vis_rules >= VISIBILITY_SECRET) {
      continue;
    }
    $thread_ids[] = $row['id'];
    $subscribed_authorized = $authorized && $row['subscribed'];
    $thread_infos[$row['id']] = array(
      'id' => $row['id'],
      'name' => $row['name'],
      'description' => $row['description'],
      'authorized' => $authorized,
      'viewerIsMember' => (int)$row['role'] >= ROLE_SUCCESSFUL_AUTH,
      'subscribed' => $subscribed_authorized,
      'parentThreadID' => $row['parent_thread_id'],
      'canChangeSettings' => (int)$row['role'] >= ROLE_CREATOR,
      'visibilityRules' => $vis_rules,
      'color' => $row['color'],
      'editRules' => (int)$row['edit_rules'],
      'creationTime' => (int)$row['creation_time'],
      'memberIDs' => array(),
    );
  }

  $thread_id_sql_string = implode(",", $thread_ids);
  $user_query = <<<SQL
SELECT r.thread, r.user, u.username
FROM roles r
LEFT JOIN users u ON r.user = u.id
WHERE r.thread IN ({$thread_id_sql_string})
SQL;
  $user_result = $conn->query($user_query);

  $users = array();
  while ($row = $result->fetch_assoc()) {
    $thread_id = $row['thread'];
    $user_id = $row['user'];
    $thread_infos[$thread_id]['memberIDs'][] = $user_id;
    $users[$user_id] = array(
      'id' => $user_id,
      'username' => $row['username'],
    );
  }

  return array($thread_infos, $users);
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

// roles is an array of arrays of:
// - user: required int
// - thread: required int
// - role: required int
// - creation_time: optional int
// - last_view: optional int
// - subscribed: optional bool
function create_user_roles($role_rows) {
  global $conn;

  if (!$role_rows) {
    return;
  }

  $time = round(microtime(true) * 1000); // in milliseconds
  $values_sql_strings = array();
  foreach ($role_rows as $role_row) {
    $creation_time = isset($role_row['creation_time'])
      ? $role_row['creation_time']
      : $time;
    $last_view = isset($role_row['last_view'])
      ? $role_row['last_view']
      : $time;
    $subscribed = isset($role_row['subscribed'])
      ? $role_row['subscribed']
      : $role_row['role'] >= ROLE_SUCCESSFUL_AUTH;
    $values_sql_strings[] = "(" . implode(",", array(
      $role_row['user'],
      $role_row['thread'],
      $role_row['role'],
      $creation_time,
      $last_view,
      $subscribed ? 1 : 0,
    )) . ")";
  }

  $values_sql_string = implode(", ", $values_sql_strings);
  $query = <<<SQL
INSERT INTO roles (user, thread, role, creation_time, last_view, subscribed)
VALUES {$values_sql_string}
ON DUPLICATE KEY UPDATE
  creation_time = LEAST(VALUES(creation_time), creation_time),
  last_view = GREATEST(VALUES(last_view), last_view),
  role = GREATEST(VALUES(role), role),
  subscribed = GREATEST(VALUES(subscribed), subscribed)
SQL;
  $conn->query($query);
}

// roles is an array of { user, thread }
function delete_user_roles($role_rows) {
  global $conn;

  if (!$role_rows) {
    return;
  }

  $where_sql_strings = array();
  foreach ($role_rows as $role_row) {
    $where_sql_strings[] =
      "(user = {$role_row['user']} AND thread = {$role_row['thread']})";
  }

  $where_sql_string = implode(" OR ", $where_sql_strings);
  $conn->query("DELETE FROM roles WHERE {$where_sql_string}");
}

function verify_thread_id($thread) {
  global $conn;

  $thread = (int)$thread;
  $result = $conn->query("SELECT id FROM threads WHERE id = {$thread}");
  $row = $result->fetch_assoc();
  return !!$row;
}

function get_extra_roles_for_joined_thread_id($thread_id) {
  global $conn;

  $thread_query = <<<SQL
SELECT visibility_rules, parent_thread_id FROM threads WHERE id={$thread_id}
SQL;
  $thread_result = $conn->query($thread_query);
  $thread_row = $thread_result->fetch_assoc();
  if (!$thread_row) {
    return null;
  }

  $vis_rules = (int)$thread_row['visibility_rules'];
  if ($vis_rules !== VISIBILITY_NESTED_OPEN) {
    return array();
  }

  $roles = array();
  $viewer_id = get_viewer_id();
  $current_thread_id = (int)$thread_row['parent_thread_id'];
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
    $roles[] = array(
      "user" => $viewer_id,
      "thread" => $current_thread_id,
      "role" => ROLE_SUCCESSFUL_AUTH,
      "subscribed" => false,
    );
    $current_thread_id = (int)$ancestor_row['parent_thread_id'];
  }
  return $roles;
}
