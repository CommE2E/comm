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
if (!isset($_POST['calendar']) || !isset($_POST['password'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

$user = get_viewer_id();
$calendar = (int)$_POST['calendar'];
$password = $_POST['password'];

$result = $conn->query(
  "SELECT hash ".
    "FROM roles r LEFT JOIN users u ON u.id = r.user ".
    "WHERE r.calendar = $calendar AND r.user = $user ".
    "AND r.role >= ".ROLE_CREATOR
);
$row = $result->fetch_assoc();
if (!$row) {
  exit(json_encode(array(
    'error' => 'internal_error',
  )));
}
if (!password_verify($password, $row['hash'])) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

$conn->query(
  "DELETE c, ic, d, id, e, ie, re, ir, ro FROM calendars c ".
    "LEFT JOIN ids ic ON ic.id = c.id ".
    "LEFT JOIN days d ON d.calendar = c.id ".
    "LEFT JOIN ids id ON id.id = d.id ".
    "LEFT JOIN entries e ON e.day = d.id ".
    "LEFT JOIN ids ie ON ie.id = e.id ".
    "LEFT JOIN revisions re ON re.entry = e.id ".
    "LEFT JOIN ids ir ON ir.id = re.id ".
    "LEFT JOIN roles ro ON ro.calendar = c.id ".
    "WHERE c.id = $calendar"
);

exit(json_encode(array(
  'success' => true,
)));
