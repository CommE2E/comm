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
  t.visibility_rules, t.creation_time, rt.id AS roletype,
  rt.name AS roletype_name, rt.permissions AS roletype_permissions, r.user,
  r.permissions, r.subscribed, u.username
FROM threads t
LEFT JOIN (
    SELECT thread, id, name, permissions FROM roletypes
    UNION SELECT id AS thread, 0 AS id, NULL AS name, NULL AS permissions FROM threads
  ) rt ON rt.thread = t.id
LEFT JOIN roles r ON r.roletype = rt.id AND r.thread = t.id
LEFT JOIN users u ON u.id = r.user
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
        "roles" => array(),
        "currentUser" => null,
      );
    }
    if (
      $row['roletype'] &&
      !isset($thread_infos[$thread_id]['roles'][$row['roletype']])
    ) {
      $roletype_permissions = json_decode($row['roletype_permissions'], true);
      $thread_infos[$thread_id]['roles'][$row['roletype']] = array(
        "id" => $row['roletype'],
        "name" => $row['roletype_name'],
        "permissions" => $roletype_permissions,
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
        "role" => (int)$row['roletype'] === 0 ? null : $row['roletype'],
      );
      $thread_infos[$thread_id]['members'][] = $member;
      if ((int)$user_id === $viewer_id) {
        $thread_infos[$thread_id]['currentUser'] = array(
          "permissions" => $member['permissions'],
          "role" => $member['role'],
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
    $thread_info['roles'] = array_values($thread_info['roles']);
    if ($thread_info['currentUser'] === null) {
      $all_permissions = get_all_thread_permissions(
        array(
          "permissions" => null,
          "visibility_rules" => $thread_info['visibilityRules'],
          "edit_rules" => $thread_info['editRules'],
        ),
        $thread_id
      );
      $thread_info['currentUser'] = array(
        "permissions" => $all_permissions,
        "role" => null,
        "subscribed" => false,
      );
    } else {
      $all_permissions = $thread_info['currentUser']['permissions'];
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
