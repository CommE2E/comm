<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');

async_start();

if (!isset($_POST['calendar']) || !isset($_POST['subscribe'])) {
  async_end(array(
    'error' => 'invalid_parameters',
    'test' => $_POST,
  ));
}
$thread = (int)$_POST['calendar'];
$subscribe = $_POST['subscribe'] ? 1 : 0;

$can_see = viewer_can_see_thread($thread);
if ($can_see === null) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
if (!$can_see) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

$viewer_id = get_viewer_id();
$time = round(microtime(true) * 1000); // in milliseconds
$conn->query(
  "INSERT INTO roles(thread, user, ".
    "creation_time, last_view, role, subscribed) ".
    "VALUES ($thread, $viewer_id, $time, $time, ".
    ROLE_VIEWED.", $subscribe) ON DUPLICATE KEY UPDATE ".
    "creation_time = LEAST(VALUES(creation_time), creation_time), ".
    "last_view = GREATEST(VALUES(last_view), last_view), ".
    "role = GREATEST(VALUES(role), role), subscribed = VALUES(subscribed)"
);

async_end(array(
  'success' => true,
));
