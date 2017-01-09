<?php

require_once('config.php');
require_once('auth.php');
require_once('calendar_lib.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}

if (
  !isset($_POST['day']) ||
  !isset($_POST['month']) ||
  !isset($_POST['year']) ||
  !isset($_POST['nav'])
) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$day = intval($_POST['day']);
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
  "SELECT e.id, u.username AS creator, e.text, e.deleted, ".
    "d.calendar AS calendarID, e.creation_time AS creationTime FROM entries e ".
    "LEFT JOIN users u ON u.id = e.creator ".
    "LEFT JOIN days d ON d.id = e.day ".
    "LEFT JOIN calendars c ON c.id = d.calendar ".
    "LEFT JOIN roles r ON r.calendar = d.calendar AND r.user = $viewer_id ".
    "WHERE MONTH(d.date) = $month AND YEAR(d.date) = $year AND ".
    "DAY(d.date) = $day AND (c.visibility_rules < ".VISIBILITY_CLOSED." OR ".
    "(r.calendar IS NOT NULL AND r.role >= ".ROLE_SUCCESSFUL_AUTH.")) AND ".
    $additional_condition." ".
    "ORDER BY e.creation_time DESC"
);

$entries = array();
while ($row = $result->fetch_assoc()) {
  $row['day'] = $day;
  $row['year'] = $year;
  $row['month'] = $month;
  $row['deleted'] = !!$row['deleted'];
  $row['creationTime'] = intval($row['creationTime']);
  $entries[] = $row;
}

exit(json_encode(array(
  'success' => true,
  'result' => $entries,
)));
