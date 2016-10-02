<?php

require_once('config.php');
require_once('auth.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}

if (!isset($_POST['id'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$id = intval($_POST['id']);

$can_see = viewer_can_see_day($id);
if ($can_see === null) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
if (!$can_see) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

$result = $conn->query(
  "SELECT u.username AS creator, e.text, e.creation_time, e.deleted ".
    "FROM entries e LEFT JOIN users u ON u.id = e.creator ".
    "WHERE e.day = $id ORDER BY e.creation_time DESC"
);
$entries = array();
while ($row = $result->fetch_assoc()) {
  $row['creation_time'] = intval($row['creation_time']);
  $row['deleted'] = !!$row['deleted'];
  $entries[] = $row;
}

exit(json_encode(array(
  'success' => true,
  'result' => $entries,
)));
