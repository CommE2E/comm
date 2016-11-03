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

$name = $conn->real_escape_string($_POST['name']);
$description = $conn->real_escape_string($_POST['description']);
if (strtolower($name) === "home") {
  exit(json_encode(array(
    'error' => 'name_taken',
  )));
}
$result = $conn->query("SELECT id FROM squads WHERE name = '$name'");
$squad_row = $result->fetch_assoc();
if ($squad_row) {
  exit(json_encode(array(
    'error' => 'name_taken',
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

$time = round(microtime(true) * 1000); // in milliseconds
$conn->query("INSERT INTO ids(table_name) VALUES('squads')");
$id = $conn->insert_id;
$creator = get_viewer_id();
$edit_rules = $is_closed ? 1 : 0; // temporary hack
if ($is_closed) {
  $salt = md5(openssl_random_pseudo_bytes(32));
  $hash = hash('sha512', $password.$salt);
  $conn->query(
    "INSERT INTO squads".
      "(id, name, description, salt, hash, edit_rules, ".
      "creator, creation_time, color) ".
      "VALUES ($id, '$name', '$description', UNHEX('$salt'), UNHEX('$hash'), ".
      "$edit_rules, $creator, $time, '$color')"
  );
} else {
  $conn->query(
    "INSERT INTO squads".
      "(id, name, description, salt, hash, edit_rules, ".
      "creator, creation_time, color) ".
      "VALUES ($id, '$name', '$description', NULL, NULL, $edit_rules, ".
      "$creator, $time, '$color')"
  );
}

$conn->query(
  "INSERT INTO roles(squad, user, last_view, role, subscribed) ".
    "VALUES ($id, $creator, $time, ".ROLE_CREATOR.", 1)"
);

exit(json_encode(array(
  'success' => true,
  'new_squad_id' => $id,
)));
