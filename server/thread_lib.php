<?php

require_once('config.php');
require_once('auth.php');

define("VISIBILITY_OPEN", 0);
define("VISIBILITY_CLOSED", 1);
define("VISIBILITY_SECRET", 2);
define("EDIT_ANYBODY", 0);
define("EDIT_LOGGED_IN", 1);

function get_thread_infos($specific_condition="") {
  global $conn;

  $viewer_id = get_viewer_id();
  $role_successful_auth = ROLE_SUCCESSFUL_AUTH;
  $where_clause = $specific_condition ? "WHERE $specific_condition" : "";

  $query = <<<SQL
SELECT t.id, t.name, r.role, t.visibility_rules,
  r.thread IS NOT NULL AND r.role >= {$role_successful_auth} AS is_authed,
  r.subscribed, t.color, t.description, t.edit_rules, t.creation_time
FROM threads t
LEFT JOIN roles r ON r.thread = t.id AND r.user = {$viewer_id}
{$where_clause}
SQL;
  $result = $conn->query($query);

  $thread_infos = array();
  while ($row = $result->fetch_assoc()) {
    $authorized = $row['is_authed'] ||
      (int)$row['visibility_rules'] < VISIBILITY_CLOSED;
    if (!$authorized && (int)$row['visibility_rules'] >= VISIBILITY_SECRET) {
      continue;
    }
    $subscribed_authorized = $authorized && $row['subscribed'];
    $thread_infos[$row['id']] = array(
      'id' => $row['id'],
      'name' => $row['name'],
      'description' => $row['description'],
      'authorized' => $authorized,
      'subscribed' => $subscribed_authorized,
      'canChangeSettings' => (int)$row['role'] >= ROLE_CREATOR,
      'visibilityRules' => (int)$row['visibility_rules'],
      'color' => $row['color'],
      'editRules' => (int)$row['edit_rules'],
      'creationTime' => (int)$row['creation_time'],
    );
  }
  return $thread_infos;
}
