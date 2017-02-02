<?php

require_once('config.php');
require_once('auth.php');
require_once('calendar_lib.php');

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
if (
  !isset($_POST['name']) ||
  !isset($_POST['description']) ||
  !isset($_POST['calendar']) ||
  !isset($_POST['color']) ||
  !isset($_POST['personal_password']) ||
  !isset($_POST['visibility_rules']) ||
  !isset($_POST['edit_rules'])
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

$visibility_rules = intval($_POST['visibility_rules']);
$new_password = null;
if ($visibility_rules >= VISIBILITY_CLOSED) {
  if (!isset($_POST['new_password'])) {
    exit(json_encode(array(
      'error' => 'invalid_parameters',
    )));
  }
  $new_password = $_POST['new_password'];
}

$user = get_viewer_id();
$calendar = (int)$_POST['calendar'];
$personal_password = $_POST['personal_password'];
$edit_rules = (int)$_POST['edit_rules'];

// Three unrelated purposes for this query, all from different tables:
// - get hash for viewer password check (users table)
// - figures out if the calendar requires auth (calendars table)
// - makes sure that viewer has the necessary permissions (roles table)
$result = $conn->query(
  "SELECT c.visibility_rules, u.hash ".
    "FROM roles r ".
    "LEFT JOIN users u ON u.id = r.user ".
    "LEFT JOIN calendars c ON c.id = r.calendar ".
    "WHERE r.calendar = $calendar AND r.user = $user ".
    "AND r.role >= ".ROLE_CREATOR
);
$row = $result->fetch_assoc();
if (!$row) {
  exit(json_encode(array(
    'error' => 'internal_error',
  )));
}
if (!password_verify($personal_password, $row['hash'])) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

// If the calendar is currently open but is being switched to closed,
// then a password *must* be specified
if (
  intval($row['visibility_rules']) < VISIBILITY_CLOSED &&
  $visibility_rules >= VISIBILITY_CLOSED &&
  trim($new_password) === ''
) {
  exit(json_encode(array(
    'error' => 'empty_password',
  )));
}

$name = $conn->real_escape_string($_POST['name']);
$description = $conn->real_escape_string($_POST['description']);
if ($visibility_rules >= VISIBILITY_CLOSED && trim($new_password) !== '') {
  $hash = password_hash($new_password, PASSWORD_BCRYPT);
  $conn->query(
    "UPDATE calendars SET name = '$name', description = '$description', ".
      "color = '$color', visibility_rules = $visibility_rules, ".
      "hash = '$hash', edit_rules = $edit_rules ".
      "WHERE id = $calendar"
  );
} else if ($visibility_rules >= VISIBILITY_CLOSED) {
  // We are guaranteed that the calendar was closed beforehand, as otherwise
  // $new_password would have to be set and the above condition would've tripped
  $conn->query(
    "UPDATE calendars SET name = '$name', description = '$description', ".
      "color = '$color', visibility_rules = $visibility_rules, ".
      "edit_rules = $edit_rules WHERE id = $calendar"
  );
} else {
  $conn->query(
    "UPDATE calendars SET name = '$name', description = '$description', ".
      "color = '$color', visiblity_rules = $visibility_rules, hash = NULL, ".
      "edit_rules = $edit_rules ".
      "WHERE id = $calendar"
  );
}

exit(json_encode(array(
  'success' => true,
)));
