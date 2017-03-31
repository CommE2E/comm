<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('calendar_lib.php');

async_start();

if (
  !isset($_POST['month']) ||
  !isset($_POST['year']) ||
  !isset($_POST['nav'])
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$month = intval($_POST['month']);
$year = intval($_POST['year']);

$home = null;
$calendar = null;
if ($_POST['nav'] === "home") {
  $home = true;
} else {
  $home = false;
  $calendar = intval($_POST['nav']);
}

$additional_condition = $home ? "r.subscribed = 1" : "d.calendar = $calendar";
$viewer_id = get_viewer_id();
$result = $conn->query(
  "SELECT e.id, DAY(d.date) AS day, e.text, e.creation_time AS creationTime, ".
    "d.calendar AS calendarID, e.deleted, u.username AS creator ".
    "FROM entries e ".
    "LEFT JOIN days d ON d.id = e.day ".
    "LEFT JOIN calendars c ON c.id = d.calendar ".
    "LEFT JOIN roles r ON r.calendar = d.calendar AND r.user = $viewer_id ".
    "LEFT JOIN users u ON u.id = e.creator ".
    "WHERE MONTH(d.date) = $month AND YEAR(d.date) = $year AND ".
    "e.deleted = 0 AND (c.visibility_rules < ".VISIBILITY_CLOSED." OR ".
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
  $row['year'] = $year;
  $row['month'] = $month;
  $row['creationTime'] = intval($row['creationTime']);
  $row['deleted'] = (bool)$row['deleted'];
  $row['creator'] = $row['creator'] ?: null;
  $entries[] = $row;
}

async_end(array(
  'success' => true,
  'result' => $entries,
));
