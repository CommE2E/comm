<?php

require_once('config.php');
require_once('day_lib.php');

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
  !isset($_POST['squad'])
) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$day = intval($_POST['day']);
$month = intval($_POST['month']);
$year = intval($_POST['year']);
$squad = intval($_POST['squad']);
$id = get_day_id($squad, $day, $month, $year);
if ($id === null) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
if (!$id) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

$result = $conn->query(
  "SELECT e.id, u.username AS creator, e.text, e.creation_time, e.deleted ".
    "FROM entries e LEFT JOIN users u ON u.id = e.creator ".
    "WHERE e.day = $id ORDER BY e.creation_time DESC"
);
$entries = array();
while ($row = $result->fetch_assoc()) {
  $row['id'] = intval($row['id']);
  $row['creation_time'] = intval($row['creation_time']);
  $row['deleted'] = !!$row['deleted'];
  $entries[] = $row;
}

exit(json_encode(array(
  'success' => true,
  'result' => $entries,
)));
