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

$can_see = viewer_can_see_entry($id);
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
  "SELECT u.username AS author, r.text, r.last_update, r.deleted ".
    "FROM revisions r LEFT JOIN users u ON u.id = r.author ".
    "WHERE r.entry = $id ORDER BY r.last_update DESC"
);
$revisions = array();
while ($row = $result->fetch_assoc()) {
  $row['last_update'] = intval($row['last_update']);
  $row['deleted'] = !!$row['deleted'];
  $revisions[] = $row;
}

exit(json_encode(array(
  'success' => true,
  'result' => $revisions,
)));
