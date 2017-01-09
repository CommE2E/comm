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

if (
  !isset($_POST['name']) ||
  !isset($_POST['description']) ||
  !isset($_POST['type']) ||
  !isset($_POST['color'])
) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

$color = strtolower($_POST['color']);
if (!preg_match('/^[a-f0-9]{6}$/', $color)) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

if (!user_logged_in()) {
  exit(json_encode(array(
    'error' => 'not_logged_in',
  )));
}

$is_closed = $_POST['type'] === 'closed';
$password = null;
if ($is_closed) {
  if (!isset($_POST['password'])) {
    exit(json_encode(array(
      'error' => 'invalid_parameters',
    )));
  }
  $password = $_POST['password'];
}

$name = $conn->real_escape_string($_POST['name']);
$description = $conn->real_escape_string($_POST['description']);
$time = round(microtime(true) * 1000); // in milliseconds
$conn->query("INSERT INTO ids(table_name) VALUES('calendars')");
$id = $conn->insert_id;
$creator = get_viewer_id();
$edit_rules = $is_closed ? 1 : 0;
$visibility_rules = $is_closed ? 1 : 0;
if ($is_closed) {
  $hash = password_hash($password, PASSWORD_BCRYPT);
  $conn->query(
    "INSERT INTO calendars".
      "(id, name, description, visibility_rules, hash, edit_rules, ".
      "creator, creation_time, color) ".
      "VALUES ($id, '$name', '$description', $visibility_rules, '$hash', ".
      "$edit_rules, $creator, $time, '$color')"
  );
} else {
  $conn->query(
    "INSERT INTO calendars".
      "(id, name, description, visibility_rules, hash, edit_rules, ".
      "creator, creation_time, color) ".
      "VALUES ($id, '$name', '$description', $visibility_rules, NULL, ".
      "$edit_rules, $creator, $time, '$color')"
  );
}

$conn->query(
  "INSERT INTO roles(calendar, user, creation_time, last_view, role, ".
    "subscribed) ".
    "VALUES ($id, $creator, $time, $time, ".ROLE_CREATOR.", 1)"
);

exit(json_encode(array(
  'success' => true,
  'new_calendar_id' => $id,
)));
