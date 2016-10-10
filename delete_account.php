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
if (!isset($_POST['password'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

$user = get_viewer_id();
$password = $_POST['password'];

$result = $conn->query(
  "SELECT LOWER(HEX(salt)) AS salt, LOWER(HEX(hash)) AS hash ".
    "FROM users WHERE id = $user"
);
$user_row = $result->fetch_assoc();
if (!$user_row) {
  exit(json_encode(array(
    'error' => 'internal_error',
  )));
}
$hash = hash('sha512', $password.$user_row['salt']);
if ($user_row['hash'] !== $hash) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

$conn->query("DELETE FROM users WHERE id = $user");
$conn->query("DELETE FROM roles WHERE user = $user");
$conn->query("DELETE FROM verifications WHERE user = $user");
$conn->query("DELETE FROM ids WHERE id = $user");

$result = $conn->query("SELECT id FROM cookies WHERE user = $user");
$delete_ids = array();
while ($row = $result->fetch_assoc()) {
  $delete_ids[] = "id = ".$row['id'];
}
if ($delete_ids) {
  $conn->query("DELETE FROM ids WHERE ".implode(' OR ', $delete_ids));
}
$conn->query("DELETE FROM cookies WHERE user = $user");

delete_cookie('user');

exit(json_encode(array(
  'success' => true,
)));
