<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('calendar_lib.php');

async_start();

// Be careful with the regex below; bad validation could lead to SQL injection
if (
  !isset($_POST['start_date']) ||
  !isset($_POST['end_date']) ||
  !preg_match("/^[0-9]{4}-[0-1][0-9]-[0-3][0-9]$/", $_POST['start_date']) ||
  !preg_match("/^[0-9]{4}-[0-1][0-9]-[0-3][0-9]$/", $_POST['end_date']) ||
  !isset($_POST['nav'])
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$start_date = $_POST['start_date'];
$end_date = $_POST['end_date'];
$include_deleted = !empty($_POST['include_deleted']);

$home = null;
$calendar = null;
if ($_POST['nav'] === "home") {
  $home = true;
} else {
  $home = false;
  $calendar = intval($_POST['nav']);
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

async_end(array(
  'success' => true,
  'result' => $entries,
));
