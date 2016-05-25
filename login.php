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

// For now this endpoint can only authenticate squads, but eventually it might
// handle users as well

if (!isset($_POST['squad'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$squad = intval($_POST['squad']);

// First, let's fetch the squad row and see if it needs authentication
$result = $conn->query(
  "SELECT LOWER(HEX(salt)) AS salt, LOWER(HEX(hash)) AS hash ".
    "FROM squads WHERE id=$squad"
);
$squad_row = $result->fetch_assoc();
if (!$squad_row) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
if ($squad_row['hash'] === null) {
  exit(json_encode(array(
    'success' => true,
  )));
}

// The squad needs authentication, so we need to validate credentials
if (!isset($_POST['password'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$password = $_POST['password'];
$hash = hash('sha512', $password.$squad_row['salt']);
if ($squad_row['hash'] !== $hash) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

list($cookie_id, $cookie_hash) = init_anonymous_cookie();

$time = round(microtime(true) * 1000); // in milliseconds
$conn->query(
  "INSERT INTO subscriptions(squad, subscriber, last_view) ".
    "VALUES ($squad, $cookie_id, $time) ".
    "ON DUPLICATE KEY UPDATE last_view = $time"
);

exit(json_encode(array(
  'success' => true,
)));
