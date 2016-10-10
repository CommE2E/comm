<?php

require_once('config.php');
require_once('auth.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}

if (!user_logged_in()) {
  exit(json_encode(array(
    'error' => 'not_logged_in',
  )));
}
if (!isset($_POST['squad']) || !isset($_POST['password'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

$user = get_viewer_id();
$squad = (int)$_POST['squad'];
$password = $_POST['password'];

$result = $conn->query(
  "SELECT LOWER(HEX(u.salt)) AS salt, LOWER(HEX(u.hash)) AS hash ".
    "FROM roles su ".
    "LEFT JOIN users u ON su.user = u.id ".
    "WHERE su.squad = $squad AND su.user = $user ".
    "AND su.role >= ".ROLE_CREATOR
);
$row = $result->fetch_assoc();
if (!$row) {
  exit(json_encode(array(
    'error' => 'internal_error',
  )));
}
$hash = hash('sha512', $password.$row['salt']);
if ($row['hash'] !== $hash) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

$conn->query("DELETE FROM squads WHERE id = $squad");
$conn->query("DELETE FROM roles WHERE squad = $squad");
$conn->query("DELETE FROM ids WHERE id = $squad");

exit(json_encode(array(
  'success' => true,
)));
