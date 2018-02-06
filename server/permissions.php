<?php

require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');

// Keep in sync with lib/types/thread-types.js

// If the user can see the thread name, description, and color
define("PERMISSION_KNOW_OF", "know_of");
// If the user can see messages, entries, and the thread info
define("PERMISSION_VISIBLE", "visible");
// If the user can send messages
define("PERMISSION_VOICED", "voiced");
// If the user can edit a thread's entries (edit text, create new, and delete)
define("PERMISSION_EDIT_ENTRIES", "edit_entries");
// If the user can change a thread's basic info (name, color, and description)
define("PERMISSION_EDIT_THREAD", "edit_thread");
// If the user can delete the thread
define("PERMISSION_DELETE_THREAD", "delete_thread");
// If the user can create subthreads on a given thread
define("PERMISSION_CREATE_SUBTHREADS", "create_subthreads");
// If the user can join this thread
define("PERMISSION_JOIN_THREAD", "join_thread");
// If the user can edit visibility rules, edit rules, password, or parent thread
define("PERMISSION_EDIT_PERMISSIONS", "edit_permissions");
// If the user can add new members to this thread
define("PERMISSION_ADD_MEMBERS", "add_members");
// If the user can remove members from this thread. If the members in question
// have a non-default role, PERMISSION_CHANGE_ROLE is also needed.
define("PERMISSION_REMOVE_MEMBERS", "remove_members");
// If the user can change the role of any other member in the thread. This is
// probably the most powerful permission.
define("PERMISSION_CHANGE_ROLE", "change_role");

$all_thread_permissions = array(
  PERMISSION_KNOW_OF,
  PERMISSION_VISIBLE,
  PERMISSION_VOICED,
  PERMISSION_EDIT_ENTRIES,
  PERMISSION_EDIT_THREAD,
  PERMISSION_DELETE_THREAD,
  PERMISSION_CREATE_SUBTHREADS,
  PERMISSION_JOIN_THREAD,
  PERMISSION_EDIT_PERMISSIONS,
  PERMISSION_ADD_MEMBERS,
  PERMISSION_REMOVE_MEMBERS,
  PERMISSION_CHANGE_ROLE,
);

define("PERMISSION_PREFIX_DESCENDANT", "descendant_");
define("PERMISSION_PREFIX_CHILD", "child_");
define("PERMISSION_PREFIX_OPEN", "open_");
define("PERMISSION_PREFIX_OPEN_DESCENDANT", "descendant_open_");

function viewer_is_member($thread) {
  global $conn;

  $viewer_id = get_viewer_id();
  $query = <<<SQL
SELECT role FROM memberships WHERE user = {$viewer_id} AND thread = {$thread}
SQL;
  $result = $conn->query($query);
  $row = $result->fetch_assoc();
  if (!$row) {
    return false;
  }
  return (int)$row['role'] !== 0;
}

function permission_lookup($blob, $permission) {
  if (!$blob || !isset($blob[$permission])) {
    return false;
  }
  return (bool)$blob[$permission]['value'];
}

// $info should include:
// - permissions: ?array
// - visibility_rules: int
function permission_helper($info, $permission) {
  if (!$info) {
    return null;
  }

  $vis_rules = $info['visibility_rules'];
  if (
    ($permission === PERMISSION_KNOW_OF && $vis_rules === VISIBILITY_OPEN) ||
    ($permission === PERMISSION_KNOW_OF && $vis_rules === VISIBILITY_CLOSED) ||
    ($permission === PERMISSION_VISIBLE && $vis_rules === VISIBILITY_OPEN) ||
    ($permission === PERMISSION_JOIN_THREAD && (
      $vis_rules === VISIBILITY_OPEN ||
      $vis_rules === VISIBILITY_CLOSED || // with closed or secret, you also
      $vis_rules === VISIBILITY_SECRET    // need to know the thread password
    ))
  ) {
    return true;
  }

  return permission_lookup($info['permissions'], $permission);
}

function get_info_from_permissions_row($row) {
  $blob = null;
  if ($row['permissions']) {
    $decoded = json_decode($row['permissions'], true);
    if (gettype($decoded) === "array") {
      $blob = $decoded;
    }
  }
  return array(
    "permissions" => $blob,
    "visibility_rules" => (int)$row['visibility_rules'],
  );
}

// null if thread does not exist
function fetch_thread_permission_info($thread) {
  global $conn;

  $viewer_id = get_viewer_id();
  $query = <<<SQL
SELECT t.visibility_rules, m.permissions
FROM threads t
LEFT JOIN memberships m ON m.thread = t.id AND m.user = {$viewer_id}
WHERE t.id = {$thread}
SQL;
  $result = $conn->query($query);
  $row = $result->fetch_assoc();
  if (!$row) {
    return null;
  }
  return get_info_from_permissions_row($row);
}

// null if thread does not exist
function check_thread_permission($thread, $permission) {
  $info = fetch_thread_permission_info($thread);
  return permission_helper($info, $permission);
}

function get_all_thread_permissions($info, $thread_id) {
  global $all_thread_permissions;

  $return = array();
  foreach ($all_thread_permissions as $permission) {
    $result = permission_helper($info, $permission);
    $source = null;
    if ($result) {
      if ($info['permissions'] && $info['permissions'][$permission]) {
        $source = (string)$info['permissions'][$permission]['source'];
      } else {
        $source = (string)$thread_id;
      }
    }
    $return[$permission] = array(
      'value' => $result,
      'source' => $source,
    );
  }
  return $return;
}

// null if entry does not exist
function check_thread_permission_for_entry($entry, $permission) {
  global $conn;

  $viewer_id = get_viewer_id();
  $query = <<<SQL
SELECT m.permissions, t.visibility_rules
FROM entries e
LEFT JOIN days d ON d.id = e.day
LEFT JOIN threads t ON t.id = d.thread
LEFT JOIN memberships m ON m.thread = t.id AND m.user = {$viewer_id}
WHERE e.id = {$entry}
SQL;
  $result = $conn->query($query);
  $row = $result->fetch_assoc();
  if (!$row || $row['visibility_rules'] === null) {
    return null;
  }
  $info = get_info_from_permissions_row($row);
  return permission_helper($info, $permission);
}

// $role_permissions: ?array<permission: int, value: bool>
//   can be null if role = 0
// $permissions_from_parent:
//   ?array<permission: string, array(value => bool, source => int)>
//   can be null if no permissions from parent (should never be empty array)
// $thread_id: int
// $vis_rules: int
// return: ?array<permission: string, array(value => bool, source => int)>
//   can be null if no permissions exist
function make_permissions_blob(
  $role_permissions,
  $permissions_from_parent,
  $thread_id,
  $vis_rules
) {
  $permissions = array();

  if ($permissions_from_parent) {
    foreach ($permissions_from_parent as $permission => $pair) {
      if (
        !vis_rules_are_open($vis_rules) &&
        (
          strpos($permission, PERMISSION_PREFIX_OPEN_DESCENDANT) === 0 ||
          strpos($permission, PERMISSION_PREFIX_OPEN) === 0
        )
      ) {
        continue;
      }
      if (strpos($permission, PERMISSION_PREFIX_OPEN) === 0) {
        $permissions[substr($permission, 5)] = $pair;
        continue;
      }
      $permissions[$permission] = $pair;
    }
  }

  if ($role_permissions) {
    foreach ($role_permissions as $permission => $value) {
      $current_pair = isset($permissions[$permission])
        ? $permissions[$permission]
        : null;
      if ($value || (!$value && (!$current_pair || !$current_pair['value']))) {
        $permissions[$permission] = array(
          'value' => $value,
          'source' => $thread_id,
        );
      }
    }
  }

  if (!$permissions) {
    return null;
  }

  return $permissions;
}

// $permissions: ?array<permission: string, array(value => bool, source => int)>
//   can be null if make_permissions_blob returns null
// return: ?array<permission: string, array(value => bool, source => int)>
//   can be null if $permissions is null, or if no permissions go to children
function permissions_for_children($permissions) {
  if (!$permissions) {
    return null;
  }
  $permissions_for_children = array();
  foreach ($permissions as $permission => $pair) {
    if (strpos($permission, PERMISSION_PREFIX_DESCENDANT) === 0) {
      $permissions_for_children[$permission] = $pair;
      $permissions_for_children[substr($permission, 11)] = $pair;
    } else if (strpos($permission, PERMISSION_PREFIX_CHILD) === 0) {
      $permissions_for_children[substr($permission, 6)] = $pair;
    }
  }
  if (!$permissions_for_children) {
    return null;
  }
  return $permissions_for_children;
}

// $to_save: array<array(
//   user_id: int,
//   thread_id: int,
//   permissions: array<permission: string, array(value => bool, source => int)>
//   permissions_for_children:
//     ?array<permission: string, array(value => bool, source => int)>
//   role: int,
//   subscription?: array(home => bool, pushNotifs => bool),
//   unread?: bool,
// )>
function save_memberships($to_save) {
  global $conn;

  if (!$to_save) {
    return;
  }

  $time = round(microtime(true) * 1000); // in milliseconds
  $new_row_sql_strings = array();
  foreach ($to_save as $role_info) {
    $permissions = "'" . $conn->real_escape_string(json_encode(
      $role_info['permissions'],
      JSON_FORCE_OBJECT
    )) . "'";
    $permissions_for_children = "NULL";
    if ($role_info['permissions_for_children']) {
      $permissions_for_children =
        "'" . $conn->real_escape_string(json_encode(
          $role_info['permissions_for_children']
        )) . "'";
    }
    $subscription = isset($role_info['subscription'])
      ? ("'" . json_encode($role_info['subscription']) . "'")
      : ("'" . '{"home":false,"pushNotifs":false}' . "'");
    $unread = isset($role_info['unread'])
      ? ($role_info['unread'] ? "1" : "0")
      : "0";

    $new_row_sql_strings[] = "(" . implode(", ", array(
      $role_info['user_id'],
      $role_info['thread_id'],
      $role_info['role'],
      $time,
      $subscription,
      $permissions,
      $permissions_for_children,
      $unread,
    )) . ")";
  }
  $new_rows_sql_string = implode(", ", $new_row_sql_strings);

  // Logic below will only update an existing membership row's `subscription`
  // column if the user is either joining or leaving the thread. That means
  // there's no way to use this function to update a user's subscription without
  // also making them join or leave the thread. The reason we do this is because
  // we need to specify a value for `subscription` here, as it's a non-null
  // column and this is an INSERT, but we don't want to require people to have
  // to know the current `subscription` when they're just using this function to
  // update the permissions of an existing membership row.
  $query = <<<SQL
INSERT INTO memberships (user, thread, role, creation_time, subscription,
  permissions, permissions_for_children, unread)
VALUES {$new_rows_sql_string}
ON DUPLICATE KEY UPDATE
  subscription = IF(
    (role = 0 AND VALUES(role) != 0)
      OR (role != 0 AND VALUES(role) = 0),
    VALUES(subscription),
    subscription
  ),
  role = VALUES(role),
  permissions = VALUES(permissions),
  permissions_for_children = VALUES(permissions_for_children)
SQL;
  $conn->query($query);
}

// $to_delete: array<array(user_id: int, thread_id: int)>
function delete_memberships($to_delete) {
  global $conn;

  if (!$to_delete) {
    return;
  }

  $delete_row_sql_strings = array();
  foreach ($to_delete as $role_info) {
    $user = $role_info['user_id'];
    $thread = $role_info['thread_id'];
    $delete_row_sql_strings[] = "(user = {$user} AND thread = {$thread})";
  }
  $delete_rows_sql_string = implode(" OR ", $delete_row_sql_strings);
  $query = <<<SQL
DELETE FROM memberships WHERE {$delete_rows_sql_string}
SQL;
  $conn->query($query);
}

// $initial_parent_thread_id: int
// $initial_users_to_permissions_from_parent:
//   array<
//     user_id: int,
//     array<permission: string, array(value => bool, source => int)>,
//   >
// returns:
//   array(
//     to_save => array<array(
//       user_id: int,
//       thread_id: int,
//       permissions: array<permission: string, array(value => bool, source => int)>
//       permissions_for_children:
//         ?array<permission: string, array(value => bool, source => int)>
//       role: int,
//     )>,
//     to_delete: array<array(user_id: int, thread_id: int)>,
//   )
// When a user's permissions for a given thread are modified, this function gets
// called to make sure the permissions of all of its child threads are updated as
// well.
function update_descendant_permissions(
  $initial_parent_thread_id,
  $initial_users_to_permissions_from_parent
) {
  global $conn;

  $stack = array(array(
    $initial_parent_thread_id,
    $initial_users_to_permissions_from_parent,
  ));
  $to_save = array();
  $to_delete = array();
  while ($stack) {
    list($parent_thread_id, $users_to_permissions_from_parent)
      = array_shift($stack);

    $user_ids = array_keys($users_to_permissions_from_parent);
    $user_id_sql_string = implode(", ", $user_ids);
    $query = <<<SQL
SELECT t.id, m.user, t.visibility_rules, r.permissions AS role_permissions,
  m.permissions, m.permissions_for_children, m.role
FROM threads t 
LEFT JOIN memberships m ON m.thread = t.id AND m.user IN ({$user_id_sql_string})
LEFT JOIN roles r ON r.id = m.role
WHERE t.parent_thread_id = {$parent_thread_id}
SQL;
    $result = $conn->query($query);

    $child_thread_infos = array();
    while ($row = $result->fetch_assoc()) {
      $thread_id = (int)$row['id'];
      if (!isset($child_thread_infos[$thread_id])) {
        $child_thread_infos[$thread_id] = array(
          "visibility_rules" => (int)$row['visibility_rules'],
          "user_infos" => array(),
        );
      }
      if (!$row['user']) {
        continue;
      }
      $user_id = (int)$row['user'];
      $child_thread_infos[$thread_id]["user_infos"][$user_id] = array(
        "role" => (int)$row['role'],
        "role_permissions" =>
          json_decode($row['role_permissions'], true),
        "permissions" =>
          json_decode($row['permissions'], true),
        "permissions_for_children" =>
          json_decode($row['permissions_for_children'], true),
      );
    }

    foreach ($child_thread_infos as $thread_id => $child_thread_info) {
      $user_infos = $child_thread_info['user_infos'];
      $users_for_next_layer = array();
      foreach (
        $users_to_permissions_from_parent as
        $user_id => $permissions_from_parent
      ) {
        $role = 0;
        $role_permissions = null;
        $old_permissions = null;
        $old_permissions_for_children = null;
        if (isset($user_infos[$user_id])) {
          $role = $user_infos[$user_id]['role'];
          $role_permissions = $user_infos[$user_id]['role_permissions'];
          $old_permissions = $user_infos[$user_id]['permissions'];
          $old_permissions_for_children =
            $user_infos[$user_id]['permissions_for_children'];
        }
        $permissions = make_permissions_blob(
          $role_permissions,
          $permissions_from_parent,
          $thread_id,
          $child_thread_info['visibility_rules']
        );
        if ($permissions == $old_permissions) {
          // This thread and all of its children need no updates, since its
          // permissions are unchanged by this operation
          continue;
        }
        $permissions_for_children = permissions_for_children($permissions);
        if ($permissions !== null) {
          $to_save[] = array(
            "user_id" => $user_id,
            "thread_id" => $thread_id,
            "permissions" => $permissions,
            "permissions_for_children" => $permissions_for_children,
            "role" => $role,
          );
        } else {
          $to_delete[] = array(
            "user_id" => $user_id,
            "thread_id" => $thread_id,
          );
        }
        if ($permissions_for_children != $old_permissions_for_children) {
          // Our children only need updates if permissions_for_children changed
          $users_for_next_layer[$user_id] = $permissions_for_children;
        }
      }
      if ($users_for_next_layer) {
        $stack[] = array($thread_id, $users_for_next_layer);
      }
    }
  }
  return array("to_save" => $to_save, "to_delete" => $to_delete);
}

// $thread_id: int
// $user_ids: array<int>
// $role: ?int
//   if nonzero integer, the ID of the corresponding role row
//   if zero, indicates that $user_id is not a member of $thread_id
//   if null, $user_id's role will be set to $thread_id's default_role, but only
//     if they don't already have a nonzero role. this is useful for adding
//     people to threads
// returns: (null if failed)
//   ?array(
//     to_save => array<array(
//       user_id: int,
//       thread_id: int,
//       permissions: array<
//         permission: string,
//         array(value => bool, source => int),
//       >,
//       permissions_for_children:
//         ?array<permission: string, array(value => bool, source => int)>
//       role: int,
//     )>,
//     to_delete: array<array(user_id: int, thread_id: int)>,
//   )
function change_role($thread_id, $user_ids, $role) {
  global $conn;

  // The code in the blocks below needs to determine three variables:
  // - $new_role, the actual $role value we're saving
  // - $role_permissions, the permissions column of the $new_role
  // - $vis_rules, the visibility rules of $thread_id
  if ($role === 0) {
    $new_role = 0;
    $role_permissions = null;
    $query = <<<SQL
SELECT visibility_rules FROM threads WHERE id = {$thread_id}
SQL;
    $result = $conn->query($query);
    $row = $result->fetch_assoc();
    if (!$row) {
      return null;
    }
    $vis_rules = (int)$row['visibility_rules'];
  } else if ($role !== null) {
    $new_role = (int)$role;
    $query = <<<SQL
SELECT t.visibility_rules, r.permissions
FROM threads t
LEFT JOIN roles r ON r.id = {$new_role}
WHERE t.id = {$thread_id}
SQL;
    $result = $conn->query($query);
    $row = $result->fetch_assoc();
    if (!$row) {
      return null;
    }
    $role_permissions = json_decode($row['permissions'], true);
    $vis_rules = (int)$row['visibility_rules'];
  } else {
    $query = <<<SQL
SELECT t.visibility_rules, t.default_role, r.permissions
FROM threads t
LEFT JOIN roles r ON r.id = t.default_role
WHERE t.id = {$thread_id}
SQL;
    $result = $conn->query($query);
    $row = $result->fetch_assoc();
    if (!$row) {
      return null;
    }
    $new_role = (int)$row['default_role'];
    $role_permissions = json_decode($row['permissions'], true);
    $vis_rules = (int)$row['visibility_rules'];
  }

  $user_id_sql_string = implode(", ", $user_ids);
  $query = <<<SQL
SELECT m.user, m.role, m.permissions_for_children,
  pm.permissions_for_children AS permissions_from_parent
FROM memberships m
LEFT JOIN threads t ON t.id = m.thread
LEFT JOIN memberships pm ON pm.thread = t.parent_thread_id AND pm.user = m.user
WHERE m.thread = {$thread_id} AND m.user IN ({$user_id_sql_string})
SQL;
  $result = $conn->query($query);

  $role_info = array();
  while ($row = $result->fetch_assoc()) {
    $user_id = (int)$row['user'];
    $old_permissions_for_children = $row['permissions_for_children']
      ? json_decode($row['permissions_for_children'], true)
      : null;
    $permissions_from_parent = $row['permissions_from_parent']
      ? json_decode($row['permissions_from_parent'], true)
      : null;
    $role_info[$user_id] = array(
      "old_role" => (int)$row['role'],
      "old_permissions_for_children" => $old_permissions_for_children,
      "permissions_from_parent" => $permissions_from_parent,
    );
  }

  $to_save = array();
  $to_delete = array();
  $to_update_descendants = array();
  foreach ($user_ids as $user_id) {
    $old_permissions_for_children = null;
    $permissions_from_parent = null;
    if (isset($role_info[$user_id])) {
      $old_role = $role_info[$user_id]['old_role'];
      if ($old_role === $new_role) {
        // If the old role is the same as the new one, we have nothing to update
        continue;
      } else if ($old_role !== 0 && $role === null) {
        // In the case where we're just trying to add somebody to a thread, if
        // they already have a role with a nonzero role then we don't need to do
        // anything
        continue;
      }
      $old_permissions_for_children =
        $role_info[$user_id]['old_permissions_for_children'];
      $permissions_from_parent =
        $role_info[$user_id]['permissions_from_parent'];
    }

    $permissions = make_permissions_blob(
      $role_permissions,
      $permissions_from_parent,
      $thread_id,
      $vis_rules
    );
    $permissions_for_children = permissions_for_children($permissions);

    if ($permissions === null) {
      $to_delete[] = array("user_id" => $user_id, "thread_id" => $thread_id);
    } else {
      $to_save[] = array(
        "user_id" => $user_id,
        "thread_id" => $thread_id,
        "permissions" => $permissions,
        "permissions_for_children" => $permissions_for_children,
        "role" => $new_role,
      );
    }

    if ($permissions_for_children != $old_permissions_for_children) {
      $to_update_descendants[$user_id] = $permissions_for_children;
    }
  }

  if ($to_update_descendants) {
    $descendant_results =
      update_descendant_permissions($thread_id, $to_update_descendants);
    $to_save = array_merge($to_save, $descendant_results['to_save']);
    $to_delete = array_merge($to_delete, $descendant_results['to_delete']);
  }
  
  return array("to_save" => $to_save, "to_delete" => $to_delete);
}

// $role: int
//   cannot be zero or null!
// $changed_role_permissions:
//   array<permission: string, bool>
// returns: (null if failed)
//   ?array(
//     to_save => array<array(
//       user_id: int,
//       thread_id: int,
//       permissions: array<
//         permission: string,
//         array(value => bool, source => int),
//       >,
//       permissions_for_children:
//         ?array<permission: string, array(value => bool, source => int)>
//       role: int,
//     )>,
//     to_delete: array<array(user_id: int, thread_id: int)>,
//   )
function edit_role_permissions($role, $changed_role_permissions) {
  global $conn;

  $role = (int)$role;
  if ($role === 0) {
    return null;
  }

  $query = <<<SQL
SELECT r.thread, r.permissions, t.visibility_rules
FROM roles r
LEFT JOIN threads t ON t.id = r.thread
WHERE r.id = {$role}
SQL;
  $result = $conn->query($query);
  $row = $result->fetch_assoc();
  if (!$row) {
    return null;
  }
  $thread_id = (int)$row['thread'];
  $vis_rules = (int)$row['visibility_rules'];
  $new_role_permissions = array_filter(array_merge(
    json_decode($row['permissions'], true),
    $changed_role_permissions
  ));

  $encoded_role_permissions =
    $conn->real_escape_string(json_encode($new_role_permissions));
  $query = <<<SQL
UPDATE roles
SET permissions = '{$encoded_role_permissions}'
WHERE id = {$role}
SQL;
  $conn->query($query);

  $query = <<<SQL
SELECT m.user, m.permissions, m.permissions_for_children,
  pm.permissions_for_children AS permissions_from_parent
FROM memberships m
LEFT JOIN threads t ON t.id = m.thread
LEFT JOIN memberships pm ON pm.thread = t.parent_thread_id AND pm.user = m.user
WHERE m.role = {$role}
SQL;
  $result = $conn->query($query);

  $to_save = array();
  $to_delete = array();
  $to_update_descendants = array();
  while ($row = $result->fetch_assoc()) {
    $user_id = (int)$row['user'];
    $permissions_from_parent = $row['permissions_from_parent']
      ? json_decode($row['permissions_from_parent'], true)
      : null;
    $old_permissions = json_decode($row['permissions'], true);
    $old_permissions_for_children = $row['permissions_for_children']
      ? json_decode($row['permissions_for_children'], true)
      : null;

    $permissions = make_permissions_blob(
      $new_role_permissions,
      $permissions_from_parent,
      $thread_id,
      $vis_rules
    );
    if ($permissions == $old_permissions) {
      // This thread and all of its children need no updates, since its
      // permissions are unchanged by this operation
      continue;
    }

    $permissions_for_children = permissions_for_children($permissions);
    if ($permissions !== null) {
      $to_save[] = array(
        "user_id" => $user_id,
        "thread_id" => $thread_id,
        "permissions" => $permissions,
        "permissions_for_children" => $permissions_for_children,
        "role" => $role,
      );
    } else {
      $to_delete[] = array(
        "user_id" => $user_id,
        "thread_id" => $thread_id,
      );
    }

    if ($permissions_for_children != $old_permissions_for_children) {
      $to_update_descendants[$user_id] = $permissions_for_children;
    }
  }

  if ($to_update_descendants) {
    $descendant_results =
      update_descendant_permissions($thread_id, $to_update_descendants);
    $to_save = array_merge($to_save, $descendant_results['to_save']);
    $to_delete = array_merge($to_delete, $descendant_results['to_delete']);
  }

  return array("to_save" => $to_save, "to_delete" => $to_delete);
}

// $thread_id: int
// $new_vis_rules: int
//   note: doesn't check if the new value is different from the old value
// returns:
//   array(
//     to_save => array<array(
//       user_id: int,
//       thread_id: int,
//       permissions: array<permission: string, array(value => bool, source => int)>
//       permissions_for_children:
//         ?array<permission: string, array(value => bool, source => int)>
//       role: int,
//     )>,
//     to_delete: array<array(user_id: int, thread_id: int)>,
//   )
function recalculate_all_permissions($thread_id, $new_vis_rules) {
  global $conn;

  $new_vis_rules = (int)$new_vis_rules;
  $thread_id = (int)$thread_id;
  $query = <<<SQL
UPDATE threads SET visibility_rules = {$new_vis_rules} WHERE id = {$thread_id}
SQL;
  $conn->query($query);

  $query = <<<SQL
SELECT m.user, m.role, m.permissions, m.permissions_for_children,
  pm.permissions_for_children AS permissions_from_parent,
  r.permissions AS role_permissions
FROM memberships m
LEFT JOIN threads t ON t.id = m.thread
LEFT JOIN roles r ON r.id = m.role
LEFT JOIN memberships pm ON pm.thread = t.parent_thread_id AND pm.user = m.user
WHERE m.thread = {$thread_id}
UNION SELECT pm.user, 0 AS role, NULL AS permissions,
  NULL AS permissions_for_children,
  pm.permissions_for_children AS permissions_from_parent,
  NULL AS role_permissions
FROM threads t
LEFT JOIN memberships pm ON pm.thread = t.parent_thread_id
LEFT JOIN memberships m ON m.thread = t.id AND m.user = pm.user
WHERE t.id = {$thread_id} AND m.thread IS NULL
SQL;
  $result = $conn->query($query);

  $to_save = array();
  $to_delete = array();
  $to_update_descendants = array();
  while ($row = $result->fetch_assoc()) {
    $user_id = (int)$row['user'];
    $role = (int)$row['role'];
    $old_permissions = $row['permissions']
      ? json_decode($row['permissions'], true)
      : null;
    $old_permissions_for_children = $row['permissions_for_children']
      ? json_decode($row['permissions_for_children'], true)
      : null;
    $permissions_from_parent = $row['permissions_from_parent']
      ? json_decode($row['permissions_from_parent'], true)
      : null;
    $role_permissions = $row['role_permissions']
      ? json_decode($row['role_permissions'], true)
      : null;

    $permissions = make_permissions_blob(
      $role_permissions,
      $permissions_from_parent,
      $thread_id,
      $new_vis_rules
    );
    if ($permissions == $old_permissions) {
      // This thread and all of its children need no updates, since its
      // permissions are unchanged by this operation
      continue;
    }

    $permissions_for_children = permissions_for_children($permissions);
    if ($permissions !== null) {
      $to_save[] = array(
        "user_id" => $user_id,
        "thread_id" => $thread_id,
        "permissions" => $permissions,
        "permissions_for_children" => $permissions_for_children,
        "role" => $role,
      );
    } else {
      $to_delete[] = array(
        "user_id" => $user_id,
        "thread_id" => $thread_id,
      );
    }

    if ($permissions_for_children != $old_permissions_for_children) {
      $to_update_descendants[$user_id] = $permissions_for_children;
    }
  }

  if ($to_update_descendants) {
    $descendant_results =
      update_descendant_permissions($thread_id, $to_update_descendants);
    $to_save = array_merge($to_save, $descendant_results['to_save']);
    $to_delete = array_merge($to_delete, $descendant_results['to_delete']);
  }
  
  return array("to_save" => $to_save, "to_delete" => $to_delete);
}

function create_initial_roles_for_new_thread($thread_id) {
  global $conn;

  $conn->query("INSERT INTO ids(table_name) VALUES('roles')");
  $member_role_id = $conn->insert_id;
  $conn->query("INSERT INTO ids(table_name) VALUES('roles')");
  $admin_role_id = $conn->insert_id;

  $member_permissions = array(
    PERMISSION_KNOW_OF => true,
    PERMISSION_VISIBLE => true,
    PERMISSION_JOIN_THREAD => true,
    PERMISSION_PREFIX_OPEN_DESCENDANT . PERMISSION_KNOW_OF => true,
    PERMISSION_PREFIX_OPEN_DESCENDANT . PERMISSION_VISIBLE => true,
    PERMISSION_PREFIX_OPEN_DESCENDANT . PERMISSION_JOIN_THREAD => true,
    PERMISSION_VOICED => true,
    PERMISSION_EDIT_ENTRIES => true,
    PERMISSION_EDIT_THREAD => true,
    PERMISSION_CREATE_SUBTHREADS => true,
    PERMISSION_ADD_MEMBERS => true,
  );
  $admin_permissions = array(
    PERMISSION_KNOW_OF => true,
    PERMISSION_VISIBLE => true,
    PERMISSION_JOIN_THREAD => true,
    PERMISSION_VOICED => true,
    PERMISSION_EDIT_ENTRIES => true,
    PERMISSION_EDIT_THREAD => true,
    PERMISSION_CREATE_SUBTHREADS => true,
    PERMISSION_ADD_MEMBERS => true,
    PERMISSION_DELETE_THREAD => true,
    PERMISSION_EDIT_PERMISSIONS => true,
    PERMISSION_REMOVE_MEMBERS => true,
    PERMISSION_CHANGE_ROLE => true,
    PERMISSION_PREFIX_DESCENDANT . PERMISSION_KNOW_OF => true,
    PERMISSION_PREFIX_DESCENDANT . PERMISSION_VISIBLE => true,
    PERMISSION_PREFIX_DESCENDANT . PERMISSION_JOIN_THREAD => true,
    PERMISSION_PREFIX_DESCENDANT . PERMISSION_VOICED => true,
    PERMISSION_PREFIX_DESCENDANT . PERMISSION_EDIT_ENTRIES => true,
    PERMISSION_PREFIX_DESCENDANT . PERMISSION_EDIT_THREAD => true,
    PERMISSION_PREFIX_DESCENDANT . PERMISSION_CREATE_SUBTHREADS => true,
    PERMISSION_PREFIX_DESCENDANT . PERMISSION_ADD_MEMBERS => true,
    PERMISSION_PREFIX_DESCENDANT . PERMISSION_DELETE_THREAD => true,
    PERMISSION_PREFIX_DESCENDANT . PERMISSION_EDIT_PERMISSIONS => true,
    PERMISSION_PREFIX_DESCENDANT . PERMISSION_REMOVE_MEMBERS => true,
    PERMISSION_PREFIX_DESCENDANT . PERMISSION_CHANGE_ROLE => true,
  );

  $encoded_member_permissions = $conn->real_escape_string(json_encode(
    $member_permissions
  ));
  $encoded_admin_permissions = $conn->real_escape_string(json_encode(
    $admin_permissions
  ));
  $time = round(microtime(true) * 1000); // in milliseconds

  $query = <<<SQL
INSERT INTO roles (id, thread, name, permissions, creation_time)
VALUES
  ({$member_role_id}, {$thread_id}, 'Members',
    '{$encoded_member_permissions}', {$time}),
  ({$admin_role_id}, {$thread_id}, 'Admins',
    '{$encoded_admin_permissions}', {$time})
SQL;
  $conn->query($query);
  return array(
    "members" => array(
      "id" => (string)$member_role_id,
      "name" => "Members",
      "permissions" => $member_permissions,
      "isDefault" => true,
    ),
    "admins" => array(
      "id" => (string)$admin_role_id,
      "name" => "Admins",
      "permissions" => $admin_permissions,
      "isDefault" => false,
    ),
  );
}
