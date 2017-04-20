<?php

require_once('config.php');
require_once('auth.php');
require_once('calendar_lib.php');

// $input should be an array that contains:
// - start_date key with date formatted like 2017-04-20
// - end_date key with same date format
// - nav key that is either calendar ID or "home"
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
  $include_deleted = !empty($input['include_deleted']);
  $home = null;
  $calendar = null;
  if ($input['nav'] === "home") {
    $home = true;
  } else {
    $home = false;
    $calendar = intval($input['nav']);
  }

  $additional_condition = $home ? "r.subscribed = 1" : "d.calendar = $calendar";
  $deleted_condition = $include_deleted ? "" : "AND e.deleted = 0 ";
  $viewer_id = get_viewer_id();
  $result = $conn->query(
    "SELECT DAY(d.date) AS day, MONTH(d.date) AS month, YEAR(d.date) AS year, ".
      "e.id, e.text, e.creation_time AS creationTime, d.calendar AS calendarID, ".
      "e.deleted, u.username AS creator ".
      "FROM entries e ".
      "LEFT JOIN days d ON d.id = e.day ".
      "LEFT JOIN calendars c ON c.id = d.calendar ".
      "LEFT JOIN roles r ON r.calendar = d.calendar AND r.user = $viewer_id ".
      "LEFT JOIN users u ON u.id = e.creator ".
      "WHERE d.date BETWEEN '$start_date' AND '$end_date' $deleted_condition".
      "AND (c.visibility_rules < ".VISIBILITY_CLOSED." OR ".
      "(r.calendar IS NOT NULL AND r.role >= ".ROLE_SUCCESSFUL_AUTH.")) AND ".
      $additional_condition." ".
      "ORDER BY e.creation_time DESC"
  );

  if ($calendar !== null) {
    $time = round(microtime(true) * 1000); // in milliseconds
    $conn->query(
      "INSERT INTO roles(calendar, user, ".
        "creation_time, last_view, role, subscribed) ".
        "VALUES ($calendar, $viewer_id, $time, $time, ".
        ROLE_VIEWED.", 0) ON DUPLICATE KEY UPDATE ".
        "creation_time = LEAST(VALUES(creation_time), creation_time), ".
        "last_view = GREATEST(VALUES(last_view), last_view), ".
        "role = GREATEST(VALUES(role), role)"
    );
  }

  $entries = array();
  while ($row = $result->fetch_assoc()) {
    $row['day'] = intval($row['day']);
    $row['year'] = intval($row['year']);
    $row['month'] = intval($row['month']);
    $row['creationTime'] = intval($row['creationTime']);
    $row['deleted'] = (bool)$row['deleted'];
    $row['creator'] = $row['creator'] ?: null;
    $entries[] = $row;
  }
  return $entries;
}
