<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('calendar_lib.php');

async_start();

if (!isset($_POST['calendar'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$calendar = intval($_POST['calendar']);

// First, let's fetch the calendar row and see if it needs authentication
$result = $conn->query("SELECT hash FROM calendars WHERE id=$calendar");
$calendar_row = $result->fetch_assoc();
if (!$calendar_row) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
if ($calendar_row['hash'] === null) {
  async_end(array(
    'success' => true,
  ));
}

// The calendar needs authentication, so we need to validate credentials
if (!isset($_POST['password'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
if (!password_verify($_POST['password'], $calendar_row['hash'])) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

$viewer_id = get_viewer_id();

$time = round(microtime(true) * 1000); // in milliseconds
$conn->query(
  "INSERT INTO roles(calendar, user, ".
    "creation_time, last_view, role, subscribed) ".
    "VALUES ($calendar, $viewer_id, $time, $time, ".
    ROLE_SUCCESSFUL_AUTH.", 0) ON DUPLICATE KEY UPDATE ".
    "creation_time = LEAST(VALUES(creation_time), creation_time), ".
    "last_view = GREATEST(VALUES(last_view), last_view), ".
    "role = GREATEST(VALUES(role), role)"
);

$calendar_infos = get_calendar_infos("c.id = $calendar");
async_end(array(
  'success' => true,
  'calendar_info' => $calendar_infos[$calendar],
));
