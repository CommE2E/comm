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
SELECT t.id, t.name, t.parent_thread_id, t.color, t.description, t.edit_rules,
  t.visibility_rules, t.creation_time, r.user, r.permissions, r.subscribed,
  r.roletype, u.username
FROM threads t
LEFT JOIN roles r ON r.thread = t.id
LEFT JOIN users u ON r.user = u.id
{$where_clause}
SQL;
  $result = $conn->query($query);

  $thread_infos = array();
  $user_infos = array();
  while ($row = $result->fetch_assoc()) {
    $thread_id = $row['id'];
    if (!$thread_infos[$thread_id]) {
      $thread_infos[$thread_id] = array(
        "id" => $thread_id,
        "name" => $row['name'],
        "description" => $row['description'],
        "visibilityRules" => (int)$row['visibility_rules'],
        "color" => $row['color'],
        "editRules" => (int)$row['edit_rules'],
        "creationTime" => (int)$row['creation_time'],
        "parentThreadID" => $row['parent_thread_id'],
        "members" => array(),
        "currentUserRole" => null,
      );
    }
    if ($row['user'] !== null && $row['username'] !== null) {
      $user_id = $row['user'];
      $permission_info = get_info_from_permissions_row($row);
      $all_permissions =
        get_all_thread_permissions($permission_info, $thread_id);
      $member = array(
        "id" => $user_id,
        "permissions" => $all_permissions,
        "roletype" => (int)$row['roletype'] === 0 ? null : $row['roletype'],
      );
      $thread_infos[$thread_id]['members'][] = $member;
      if ((int)$user_id === $viewer_id) {
        $thread_infos[$thread_id]['currentUserRole'] = array(
          "permissions" => $member['permissions'],
          "roletype" => $member['roletype'],
          "subscribed" => !!$row['subscribed'],
        );
      }
      $user_infos[$user_id] = array(
        "id" => $user_id,
        "username" => $row['username'],
      );
    }
  }

  $final_thread_infos = array();
  foreach ($thread_infos as $thread_id => $thread_info) {
    if ($thread_info['currentUserRole'] === null) {
      $all_permissions = get_all_thread_permissions(
        array(
          "permissions" => null,
          "visibility_rules" => $thread_info['visibilityRules'],
          "edit_rules" => $thread_info['editRules'],
        ),
        $thread_id
      );
      $thread_info['currentUserRole'] = array(
        "permissions" => $all_permissions,
        "roletype" => null,
        "subscribed" => false,
      );
    } else {
      $all_permissions = $thread_info['currentUserRole']['permissions'];
    }
    if (permission_lookup($all_permissions, PERMISSION_KNOW_OF)) {
      $final_thread_infos[$thread_id] = $thread_info;
    }
  }

  return array($final_thread_infos, $user_infos);
}

function verify_thread_id($thread) {
  global $conn;

  $thread = (int)$thread;
  $result = $conn->query("SELECT id FROM threads WHERE id = {$thread}");
  $row = $result->fetch_assoc();
  return !!$row;
}
