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

$conn->query("UPDATE entries SET deleted = 1 WHERE id = $id");

exit(json_encode(array(
  'success' => true,
)));
