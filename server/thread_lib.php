<?php

require_once('config.php');
require_once('auth.php');
require_once('permissions.php');

define("VISIBILITY_OPEN", 0);
define("VISIBILITY_CLOSED", 1);
define("VISIBILITY_SECRET", 2);
define("VISIBILITY_NESTED_OPEN", 3);
define("VISIBILITY_THREAD_SECRET", 4);
define("EDIT_ANYBODY", 0);
define("EDIT_LOGGED_IN", 1);

function vis_rules_are_open($vis_rules) {
  return $vis_rules === VISIBILITY_OPEN || $vis_rules === VISIBILITY_NESTED_OPEN;
}

function get_thread_infos($specific_condition="") {
  global $conn;

  $viewer_id = get_viewer_id();
  $where_clause = $specific_condition ? "WHERE $specific_condition" : "";

  $query = <<<SQL
SELECT t.id, t.name, t.parent_thread_id, tr.subscribed, t.color, t.description,
  tr.permissions, t.edit_rules, t.visibility_rules, t.creation_time, tr.roletype
FROM threads t
LEFT JOIN roles tr ON tr.thread = t.id AND tr.user = {$viewer_id}
{$where_clause}
SQL;
  $result = $conn->query($query);

  $thread_infos = array();
  $thread_ids = array();
  while ($row = $result->fetch_assoc()) {
    if (!permission_helper($row, PERMISSION_KNOW_OF)) {
      continue;
    }
    $thread_ids[] = $row['id'];
    $authorized = permission_helper($row, PERMISSION_VISIBLE);
    $subscribed_authorized = $authorized && $row['subscribed'];
    $thread_infos[$row['id']] = array(
      'id' => $row['id'],
      'name' => $row['name'],
      'description' => $row['description'],
      'authorized' => $authorized,
      'viewerIsMember' => (int)$row['roletype'] !== 0,
      'subscribed' => $subscribed_authorized,
      'parentThreadID' => $row['parent_thread_id'],
      'canChangeSettings' => permission_helper($row, PERMISSION_EDIT_THREAD),
      'visibilityRules' => (int)$row['visibility_rules'],
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
WHERE r.thread IN ({$thread_id_sql_string}) AND u.username IS NOT NULL
SQL;
  $user_result = $conn->query($user_query);

  $users = array();
  while ($row = $user_result->fetch_assoc()) {
    $thread_id = $row['thread'];
    $user_id = $row['user'];
    $username = $row['username'];
    $thread_infos[$thread_id]['memberIDs'][] = $user_id;
    $users[$user_id] = array(
      'id' => $user_id,
      'username' => $username,
    );
  }

  return array($thread_infos, $users);
}

function verify_thread_id($thread) {
  global $conn;

  $thread = (int)$thread;
  $result = $conn->query("SELECT id FROM threads WHERE id = {$thread}");
  $row = $result->fetch_assoc();
  return !!$row;
}
