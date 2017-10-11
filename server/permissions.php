<?php

require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');

// null if thread does not exist
function viewer_can_see_thread($thread) {
  global $conn;

  $viewer_id = get_viewer_id();
  $visibility_closed = VISIBILITY_CLOSED;
  $visibility_nested_open = VISIBILITY_NESTED_OPEN;
  $role_successful_auth = ROLE_SUCCESSFUL_AUTH;
  $query = <<<SQL
SELECT (
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
WHERE t.id = {$thread}
SQL;
  $result = $conn->query($query);
  $thread_row = $result->fetch_assoc();
  if (!$thread_row) {
    return null;
  }
  return !$thread_row['requires_auth'];
}

// null if day does not exist
function viewer_can_see_day($day) {
  global $conn;

  $viewer_id = get_viewer_id();
  $visibility_closed = VISIBILITY_CLOSED;
  $visibility_nested_open = VISIBILITY_NESTED_OPEN;
  $role_successful_auth = ROLE_SUCCESSFUL_AUTH;
  $query = <<<SQL
SELECT (
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
FROM days d
LEFT JOIN threads t ON t.id = d.thread
LEFT JOIN roles tr ON tr.thread = d.thread AND tr.user = {$viewer_id}
LEFT JOIN threads a ON a.id = t.concrete_ancestor_thread_id
LEFT JOIN roles ar
  ON ar.thread = t.concrete_ancestor_thread_id AND ar.user = {$viewer_id}
WHERE d.id = {$day}
SQL;
  $result = $conn->query($query);
  $day_row = $result->fetch_assoc();
  if (!$day_row) {
    return null;
  }
  return !$day_row['requires_auth'];
}

// null if entry does not exist
function viewer_can_see_entry($entry) {
  global $conn;

  $viewer_id = get_viewer_id();
  $visibility_closed = VISIBILITY_CLOSED;
  $visibility_nested_open = VISIBILITY_NESTED_OPEN;
  $role_successful_auth = ROLE_SUCCESSFUL_AUTH;
  $query = <<<SQL
SELECT (
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
FROM entries e
LEFT JOIN days d ON d.id = e.day
LEFT JOIN threads t ON t.id = d.thread
LEFT JOIN roles tr ON tr.thread = t.id AND tr.user = {$viewer_id}
LEFT JOIN threads a ON a.id = t.concrete_ancestor_thread_id
LEFT JOIN roles ar
  ON ar.thread = t.concrete_ancestor_thread_id AND ar.user = {$viewer_id}
WHERE e.id = {$entry}
SQL;
  $result = $conn->query($query);
  $entry_row = $result->fetch_assoc();
  if (!$entry_row) {
    return null;
  }
  return !$entry_row['requires_auth'];
}

function edit_rules_helper($mysql_row) {
  if (!$mysql_row) {
    return null;
  }
  if ($mysql_row['requires_auth']) {
    return false;
  }
  if (!user_logged_in() && intval($mysql_row['edit_rules']) === 1) {
    return false;
  }
  return true;
}

// null if thread does not exist
// false if the viewer can't see into the thread, or can't edit it
// true if the viewer can see into and edit the thread
function viewer_can_edit_thread($thread) {
  global $conn;

  $viewer_id = get_viewer_id();
  $role_successful_auth = ROLE_SUCCESSFUL_AUTH;
  $visibility_closed = VISIBILITY_CLOSED;
  $visibility_nested_open = VISIBILITY_NESTED_OPEN;
  $query = <<<SQL
SELECT t.edit_rules, (
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
WHERE t.id = {$thread}
SQL;
  $result = $conn->query($query);
  return edit_rules_helper($result->fetch_assoc());
}

// null if entry does not exist
// false if the viewer can't see into the thread, or can't edit it
// true if the viewer can see into and edit the thread
// note that this function does not check if the entry is deleted
function viewer_can_edit_entry($entry) {
  global $conn;

  $viewer_id = get_viewer_id();
  $role_successful_auth = ROLE_SUCCESSFUL_AUTH;
  $visibility_closed = VISIBILITY_CLOSED;
  $visibility_nested_open = VISIBILITY_NESTED_OPEN;
  $query = <<<SQL
SELECT t.edit_rules, (
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
FROM entries e
LEFT JOIN days d ON d.id = e.day
LEFT JOIN threads t ON t.id = d.thread
LEFT JOIN roles tr ON tr.thread = t.id AND tr.user = {$viewer_id}
LEFT JOIN threads a ON a.id = t.concrete_ancestor_thread_id
LEFT JOIN roles ar
  ON ar.thread = t.concrete_ancestor_thread_id AND ar.user = {$viewer_id}
WHERE e.id = {$entry}
SQL;
  $result = $conn->query($query);
  return edit_rules_helper($result->fetch_assoc());
}
