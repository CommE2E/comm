<?php

require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');

// $input should be an array that contains:
// - start_date key with date formatted like 2017-04-20
// - end_date key with same date format
// - nav key that is either thread ID or "home"
// - (optional) include_deleted key whether deleted entries should be included
// be careful! $input isn't sanitized before being passed it
function get_entry_infos($input) {
  global $conn;

  // Be careful with the regex below; bad validation could lead to SQL injection
  if (
    !is_array($input) ||
    !isset($input['start_date']) ||
    !isset($input['end_date']) ||
    !preg_match("/^[0-9]{4}-[0-1][0-9]-[0-3][0-9]$/", $input['start_date']) ||
    !preg_match("/^[0-9]{4}-[0-1][0-9]-[0-3][0-9]$/", $input['end_date']) ||
    !isset($input['nav'])
  ) {
    return null;
  }

  $start_date = $input['start_date'];
  $end_date = $input['end_date'];
  $include_deleted =
    !empty($input['include_deleted']) && $input['include_deleted'];
  $home = null;
  $thread = null;
  if ($input['nav'] === "home") {
    $home = true;
  } else {
    $home = false;
    $thread = intval($input['nav']);
  }

  $additional_condition = $home ? "tr.subscribed = 1" : "d.thread = $thread";
  $deleted_condition = $include_deleted ? "" : "AND e.deleted = 0 ";
  $viewer_id = get_viewer_id();
  $visibility_closed = VISIBILITY_CLOSED;
  $visibility_nested_open = VISIBILITY_NESTED_OPEN;
  $role_successful_auth = ROLE_SUCCESSFUL_AUTH;
  $select_query = <<<SQL
SELECT DAY(d.date) AS day, MONTH(d.date) AS month, YEAR(d.date) AS year,
  e.id, e.text, e.creation_time AS creationTime, d.thread AS threadID,
  e.deleted, e.creator AS creatorID, u.username AS creator
FROM entries e
LEFT JOIN days d ON d.id = e.day
LEFT JOIN threads t ON t.id = d.thread
LEFT JOIN roles tr ON tr.thread = d.thread AND tr.user = {$viewer_id}
LEFT JOIN threads a ON a.id = t.concrete_ancestor_thread_id
LEFT JOIN roles ar
  ON ar.thread = t.concrete_ancestor_thread_id AND ar.user = {$viewer_id}
LEFT JOIN users u ON u.id = e.creator
WHERE (
    t.visibility_rules < {$visibility_closed} OR
    t.visibility_rules = {$visibility_nested_open} OR
    (tr.thread IS NOT NULL AND tr.role >= {$role_successful_auth})
  ) AND (
    t.visibility_rules != {$visibility_nested_open} OR
    a.visibility_rules < {$visibility_closed} OR
    (ar.thread IS NOT NULL AND ar.role >= {$role_successful_auth})
  ) AND d.date BETWEEN '{$start_date}' AND '{$end_date}'
  AND {$additional_condition} {$deleted_condition}
ORDER BY e.creation_time DESC
SQL;
  $result = $conn->query($select_query);

  if ($thread !== null) {
    create_user_roles(array(array(
      "user" => $viewer_id,
      "thread" => $thread,
      "role" => ROLE_VIEWED,
    )));
  }

  $entries = array();
  $users = array();
  while ($row = $result->fetch_assoc()) {
    $entries[] = array(
      'id' => $row['id'],
      'threadID' => $row['threadID'],
      'text' => $row['text'],
      'year' => intval($row['year']),
      'month' => intval($row['month']),
      'day' => intval($row['day']),
      'creationTime' => intval($row['creationTime']),
      'creatorID' => $row['creatorID'],
      'deleted' => (bool)$row['deleted'],
    );
    if ($row['creator']) {
      $users[$row['creatorID']] = array(
        'id' => $row['creatorID'],
        'username' => $row['creator'],
      );
    }
  }
  return array($entries, $users);
}
