<?php

require_once('async_lib.php');
require_once('activity_lib.php');

async_start();

$activity_updates = isset($_POST['activity_updates'])
  ? $_POST['activity_updates']
  : array();
$result = update_activity($activity_updates);
if ($result === null) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

async_end(array(
  'success' => true,
  'set_unfocused_to_unread' => $result,
));
