<?php

require_once('config.php');
require_once('auth.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}

if (!isset($_POST['calendar']) || !isset($_POST['subscribe'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
    'test' => $_POST,
  )));
}
$calendar = (int)$_POST['calendar'];
$subscribe = $_POST['subscribe'] ? 1 : 0;

$can_see = viewer_can_see_calendar($calendar);
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

$viewer_id = get_viewer_id();
$time = round(microtime(true) * 1000); // in milliseconds
$conn->query(
  "INSERT INTO roles(calendar, user, ".
    "creation_time, last_view, role, subscribed) ".
    "VALUES ($calendar, $viewer_id, $time, $time, ".
    ROLE_VIEWED.", $subscribe) ON DUPLICATE KEY UPDATE ".
    "creation_time = LEAST(VALUES(creation_time), creation_time), ".
    "last_view = GREATEST(VALUES(last_view), last_view), ".
    "role = GREATEST(VALUES(role), role), subscribed = VALUES(subscribed)"
);

exit(json_encode(array(
  'success' => true,
)));
