<?php

require_once('config.php');
require_once('auth.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  exit(json_encode(array(
    'error' => 'tls_failure',
  )));
}

if (!isset($_POST['squad'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$calendar = intval($_POST['squad']);

// First, let's fetch the calendar row and see if it needs authentication
$result = $conn->query(
  "SELECT LOWER(HEX(salt)) AS salt, LOWER(HEX(hash)) AS hash ".
    "FROM squads WHERE id=$calendar"
);
$calendar_row = $result->fetch_assoc();
if (!$calendar_row) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
if ($calendar_row['hash'] === null) {
  exit(json_encode(array(
    'success' => true,
  )));
}

// The calendar needs authentication, so we need to validate credentials
if (!isset($_POST['password'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$password = $_POST['password'];
$hash = hash('sha512', $password.$calendar_row['salt']);
if ($calendar_row['hash'] !== $hash) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

$viewer_id = get_viewer_id();

$time = round(microtime(true) * 1000); // in milliseconds
$conn->query(
  "INSERT INTO roles(squad, user, last_view, role, subscribed) ".
    "VALUES ($calendar, $viewer_id, $time, ".ROLE_SUCCESSFUL_AUTH.", 0) ON ".
    "DUPLICATE KEY UPDATE last_view = GREATEST(VALUES(last_view), last_view), ".
    "role = GREATEST(VALUES(role), role), ".
    "subscribed = GREATEST(VALUES(subscribed), subscribed)"
);

exit(json_encode(array(
  'success' => true,
)));
