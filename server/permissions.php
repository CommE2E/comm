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

define("PERMISSION_PREFIX_DESCENDANT", "descendant_");
define("PERMISSION_PREFIX_CHILD", "child_");
define("PERMISSION_PREFIX_OPEN", "open_");
define("PERMISSION_PREFIX_OPEN_DESCENDANT", "descendant_open_");

function viewer_is_member($thread) {
  global $conn;

  $viewer_id = get_viewer_id();
  $query = <<<SQL
SELECT roletype FROM roles WHERE user = {$viewer_id} AND thread = {$thread}
SQL;
  $result = $conn->query($query);
  $row = $result->fetch_assoc();
  if (!$row) {
    return false;
  }
  return (int)$row['roletype'] !== 0;
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
// - edit_rules: int
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
  } else if (
    $permission === PERMISSION_EDIT_ENTRIES && (
      $vis_rules === VISIBILITY_OPEN ||
      $vis_rules === VISIBILITY_CLOSED ||
      $vis_rules === VISIBILITY_SECRET
    )
  ) {
    // The legacy visibility classes have functionality where you can play
    // around with them on web without being logged in. This allows anybody
    // that passes a visibility check to edit the calendar entries of a thread,
    // regardless of membership in that thread. Depending on edit_rules, the
    // ability may be restricted to only logged in users.
    $lookup = permission_lookup($info['permissions'], $permission);
    if ($lookup) {
      return true;
    }
    $can_view = permission_helper($info, PERMISSION_VISIBLE);
    if (!$can_view) {
      return false;
    }
    if ($info['edit_rules'] === EDIT_LOGGED_IN) {
      return user_logged_in();
    }
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
    "edit_rules" => (int)$row['edit_rules'],
  );
}

// null if thread does not exist
function fetch_thread_permission_info($thread) {
  global $conn;

  $viewer_id = get_viewer_id();
  $query = <<<SQL
SELECT tr.permissions, t.visibility_rules, t.edit_rules
FROM threads t
LEFT JOIN roles tr ON tr.thread = t.id AND tr.user = {$viewer_id}
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

// null if entry does not exist
function check_thread_permission_for_entry($entry, $permission) {
  global $conn;

  $viewer_id = get_viewer_id();
  $query = <<<SQL
SELECT tr.permissions, t.visibility_rules, t.edit_rules
FROM entries e
LEFT JOIN days d ON d.id = e.day
LEFT JOIN threads t ON t.id = d.thread
LEFT JOIN roles tr ON tr.thread = t.id AND tr.user = {$viewer_id}
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

// $roletype_permissions: ?array<permission: int, value: bool>
//   can be null if roletype = 0
// $permissions_from_parent:
//   ?array<permission: string, array(value => bool, source => int)>
//   can be null if no permissions from parent (should never be empty array)
// $thread_id: int
// $vis_rules: int
// return: ?array<permission: string, array(value => bool, source => int)>
//   can be null if no permissions exist
function make_permissions_blob(
  $roletype_permissions,
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

  if ($roletype_permissions) {
    foreach ($roletype_permissions as $permission => $value) {
      $current_pair = isset($permissions[$permission])
        ? $permissions[$permission]
        : null;
      if ($value || (!$value && (!$current_pair || !$current_pair[1]))) {
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
//   roletype: int,
//   subscribed?: bool,
// )>
function save_user_roles($to_save) {
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
    $visible = isset($role_info['permissions'][PERMISSION_VISIBLE]['value'])
      ? ($role_info['permissions'][PERMISSION_VISIBLE]['value'] ? "1" : "0")
      : "0";
    $subscribed = isset($role_info['subscribed'])
      ? ($role_info['subscribed'] ? "1" : "0")
      : "0";

    $new_row_sql_strings[] = "(" . implode(", ", array(
      $role_info['user_id'],
      $role_info['thread_id'],
      $role_info['roletype'],
      $time,
      $subscribed,
      $permissions,
      $permissions_for_children,
      $visible,
    )) . ")";
  }
  $new_rows_sql_string = implode(", ", $new_row_sql_strings);

  // Logic below will only update an existing role row's `subscribed` column if
  // the user is either leaving or joining the thread. Generally, joining means
  // you subscribe and leaving means you unsubscribe.
  $query = <<<SQL
INSERT INTO roles (user, thread, roletype, creation_time, subscribed,
  permissions, permissions_for_children, visible)
VALUES {$new_rows_sql_string}
ON DUPLICATE KEY UPDATE
  subscribed = IF(
    (roletype = 0 AND VALUES(roletype) != 0)
      OR (roletype != 0 AND VALUES(roletype) = 0),
    VALUES(subscribed),
    subscribed
  ),
  roletype = VALUES(roletype),
  permissions = VALUES(permissions),
  permissions_for_children = VALUES(permissions_for_children),
  visible = VALUES(visible)
SQL;
  $conn->query($query);
}

// $to_delete: array<array(user_id: int, thread_id: int)>
function delete_user_roles($to_delete) {
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
DELETE FROM roles WHERE {$delete_rows_sql_string}
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
//       roletype: int,
//     )>,
//     to_delete: array<array(user_id: int, thread_id: int)>,
//   )
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
SELECT t.id, r.user, t.visibility_rules, rt.permissions AS roletype_permissions,
  r.permissions, r.permissions_for_children, r.roletype
FROM threads t 
LEFT JOIN roles r ON r.thread = t.id AND r.user IN ({$user_id_sql_string})
LEFT JOIN roletypes rt ON rt.id = r.roletype
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
        "roletype" => (int)$row['roletype'],
        "roletype_permissions" =>
          json_decode($row['roletype_permissions'], true),
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
        $roletype = 0;
        $roletype_permissions = null;
        $old_permissions = null;
        $old_permissions_for_children = null;
        if (isset($user_infos[$user_id])) {
          $roletype = $user_infos[$user_id]['roletype'];
          $roletype_permissions = $user_infos[$user_id]['roletype_permissions'];
          $old_permissions = $user_infos[$user_id]['permissions'];
          $old_permissions_for_children =
            $user_infos[$user_id]['permissions_for_children'];
        }
        $permissions = make_permissions_blob(
          $roletype_permissions,
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
            "roletype" => $roletype,
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
// $roletype: ?int
//   if nonzero integer, the ID of the corresponding roletype row
//   if zero, indicates that $user_id is not a member of $thread_id
//   if null, $user_id's roletype will be set to $thread_id's default_roletype,
//     but only if they don't already have a nonzero roletype. this is useful
//     for adding people to threads
// returns: (null if failed)
//   ?array(
//     to_save => array<array(
//       user_id: int,
//       thread_id: int,
//       permissions: array<permission: string, array(value => bool, source => int)>
//       permissions_for_children:
//         ?array<permission: string, array(value => bool, source => int)>
//       roletype: int,
//     )>,
//     to_delete: array<array(user_id: int, thread_id: int)>,
//   )
function change_roletype($thread_id, $user_ids, $roletype) {
  global $conn;

  // The code in the blocks below needs to determine three variables:
  // - $new_roletype, the actual $roletype value we're saving
  // - $roletype_permissions, the permissions column of the $new_roletype
  // - $vis_rules, the visibility rules of $thread_id
  if ($roletype === 0) {
    $new_roletype = 0;
    $roletype_permissions = null;
    $query = <<<SQL
SELECT visibility_rules FROM threads WHERE id = {$thread_id}
SQL;
    $result = $conn->query($query);
    $row = $result->fetch_assoc();
    if (!$row) {
      return null;
    }
    $vis_rules = (int)$row['visibility_rules'];
  } else if ($roletype !== null) {
    $new_roletype = (int)$roletype;
    $query = <<<SQL
SELECT t.visibility_rules, rt.permissions
FROM threads t
LEFT JOIN roletypes rt ON rt.id = {$new_roletype}
WHERE t.id = {$thread_id}
SQL;
    $result = $conn->query($query);
    $row = $result->fetch_assoc();
    if (!$row) {
      return null;
    }
    $roletype_permissions = json_decode($row['permissions'], true);
    $vis_rules = (int)$row['visibility_rules'];
  } else {
    $query = <<<SQL
SELECT t.visibility_rules, t.default_roletype, rt.permissions
FROM threads t
LEFT JOIN roletypes rt ON rt.id = t.default_roletype
WHERE t.id = {$thread_id}
SQL;
    $result = $conn->query($query);
    $row = $result->fetch_assoc();
    if (!$row) {
      return null;
    }
    $new_roletype = (int)$row['default_roletype'];
    $roletype_permissions = json_decode($row['permissions'], true);
    $vis_rules = (int)$row['visibility_rules'];
  }

  $user_id_sql_string = implode(", ", $user_ids);
  $query = <<<SQL
SELECT r.user, r.roletype, r.permissions_for_children,
  pr.permissions_for_children AS permissions_from_parent
FROM roles r
LEFT JOIN threads t ON t.id = r.thread
LEFT JOIN roles pr ON pr.thread = t.parent_thread_id AND pr.user = r.user
WHERE r.thread = {$thread_id} AND r.user IN ({$user_id_sql_string})
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
      "old_roletype" => (int)$row['roletype'],
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
      $old_roletype = $role_info[$user_id]['old_roletype'];
      if ($old_roletype === $new_roletype) {
        // If the old roletype is the same as the new one, we have nothing to
        // update
        continue;
      } else if ($old_roletype !== 0 && $roletype === null) {
        // In the case where we're just trying to add somebody to a thread, if
        // they already have a role with a nonzero roletype then we don't need
        // to do anything
        continue;
      }
      $old_permissions_for_children =
        $role_info[$user_id]['old_permissions_for_children'];
      $permissions_from_parent =
        $role_info[$user_id]['permissions_from_parent'];
    }

    $permissions = make_permissions_blob(
      $roletype_permissions,
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
        "roletype" => $new_roletype,
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
//       roletype: int,
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
SELECT r.user, r.roletype, r.permissions, r.permissions_for_children,
  pr.permissions_for_children AS permissions_from_parent,
  rt.permissions AS roletype_permissions
FROM roles r
LEFT JOIN threads t ON t.id = r.thread
LEFT JOIN roletypes rt ON rt.id = r.roletype
LEFT JOIN roles pr ON pr.thread = t.parent_thread_id AND pr.user = r.user
WHERE r.thread = {$thread_id}
SQL;
  $result = $conn->query($query);

  $to_save = array();
  $to_delete = array();
  $to_update_descendants = array();
  while ($row = $result->fetch_assoc()) {
    $user_id = (int)$row['user'];
    $roletype = (int)$row['roletype'];
    $old_permissions = json_decode($row['permissions'], true);
    $old_permissions_for_children = $row['permissions_for_children']
      ? json_decode($row['permissions_for_children'], true)
      : null;
    $permissions_from_parent = $row['permissions_from_parent']
      ? json_decode($row['permissions_from_parent'], true)
      : null;
    $roletype_permissions = $row['roletype_permissions']
      ? json_decode($row['roletype_permissions'], true)
      : null;

    $permissions = make_permissions_blob(
      $roletype_permissions,
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
        "roletype" => $roletype,
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

function create_initial_roletypes_for_new_thread($thread_id) {
  global $conn;

  $conn->query("INSERT INTO ids(table_name) VALUES('roletypes')");
  $member_roletype_id = $conn->insert_id;
  $conn->query("INSERT INTO ids(table_name) VALUES('roletypes')");
  $creator_roletype_id = $conn->insert_id;

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
  $creator_permissions = array(
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
  );

  $encoded_member_permissions = $conn->real_escape_string(json_encode(
    $member_permissions
  ));
  $encoded_creator_permissions = $conn->real_escape_string(json_encode(
    $creator_permissions
  ));
  $time = round(microtime(true) * 1000); // in milliseconds

  $query = <<<SQL
INSERT INTO roletypes (id, thread, name, permissions, creation_time)
VALUES
  ({$member_roletype_id}, {$thread_id}, 'Members',
    '{$encoded_member_permissions}', {$time}),
  ({$creator_roletype_id}, {$thread_id}, 'Creator',
    '{$encoded_creator_permissions}', {$time})
SQL;
  $conn->query($query);
  return array(
    "member_roletype_id" => $member_roletype_id,
    "creator_roletype_id" => $creator_roletype_id,
  );
}
