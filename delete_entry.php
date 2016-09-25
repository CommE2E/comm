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

$viewer_id = get_viewer_id();
$result = $conn->query(
  "SELECT sq.hash IS NOT NULL AND su.squad IS NULL AS requires_auth ".
    "FROM entries e ".
    "LEFT JOIN days d ON d.id = e.day ".
    "LEFT JOIN squads sq ON sq.id = d.squad ".
    "LEFT JOIN subscriptions su ".
    "ON sq.id = su.squad AND su.subscriber = {$viewer_id} ".
    "WHERE e.id = $id"
);
$entry_row = $result->fetch_assoc();
if (!$entry_row) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
if ((bool)$squad_row['requires_auth']) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

$conn->query("UPDATE entries SET deleted = 1 WHERE id = $id");

exit(json_encode(array(
  'success' => true,
)));
