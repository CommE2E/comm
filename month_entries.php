<?php

require_once('config.php');
require_once('auth.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}

if (
  !isset($_POST['month']) ||
  !isset($_POST['year']) ||
  !isset($_POST['nav'])
) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

$month = intval($_POST['month']);
$year = intval($_POST['year']);

$home = null;
$squad = null;
if ($_POST['nav'] === "home") {
  $home = true;
} else {
  $home = false;
  $squad = intval($_POST['nav']);
}

$additional_condition = $home ? "r.subscribed = 1" : "d.squad = $squad";
$viewer_id = get_viewer_id();
$result = $conn->query(
  "SELECT e.id, DAY(d.date) AS day, e.text, e.creation_time AS creationTime, ".
    "d.squad AS squadID ".
    "FROM entries e ".
    "LEFT JOIN days d ON d.id = e.day ".
    "LEFT JOIN squads s ON s.id = d.squad ".
    "LEFT JOIN roles r ON r.squad = d.squad AND r.user = $viewer_id ".
    "WHERE MONTH(d.date) = $month AND YEAR(d.date) = $year AND ".
    "e.deleted = 0 AND (s.hash IS NULL OR (r.squad IS NOT NULL AND ".
    "r.role >= ".ROLE_SUCCESSFUL_AUTH.")) AND ".$additional_condition." ".
    "ORDER BY e.creation_time DESC"
);

$entries = array();
while ($row = $result->fetch_assoc()) {
  $row['day'] = intval($row['day']);
  $row['year'] = $year;
  $row['month'] = $month;
  $row['creationTime'] = intval($row['creationTime']);
  $entries[] = $row;
}

exit(json_encode(array(
  'success' => true,
  'result' => $entries,
)));
