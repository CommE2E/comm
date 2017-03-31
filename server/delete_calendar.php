<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');

async_start();

if (!user_logged_in()) {
  async_end(array(
    'error' => 'not_logged_in',
  ));
}
if (!isset($_POST['calendar']) || !isset($_POST['password'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
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
  async_end(array(
    'error' => 'internal_error',
  ));
}
if (!password_verify($password, $row['hash'])) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
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

async_end(array(
  'success' => true,
));
