<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');

async_start();

if (!isset($_POST['id'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$id = intval($_POST['id']);

$can_see = viewer_can_see_entry($id);
if ($can_see === null) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
if (!$can_see) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

$result = $conn->query(
  "SELECT r.id, u.username AS author, r.text, r.last_update AS lastUpdate, ".
    "r.deleted, d.thread AS calendarID, r.entry AS entryID ".
    "FROM revisions r LEFT JOIN users u ON u.id = r.author ".
    "LEFT JOIN entries e ON e.id = r.entry ".
    "LEFT JOIN days d ON d.id = e.day ".
    "WHERE r.entry = $id ORDER BY r.last_update DESC"
);
$revisions = array();
while ($row = $result->fetch_assoc()) {
  $row['lastUpdate'] = intval($row['lastUpdate']);
  $row['deleted'] = !!$row['deleted'];
  $revisions[] = $row;
}

async_end(array(
  'success' => true,
  'result' => $revisions,
));
