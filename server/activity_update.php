<?php

require_once('async_lib.php');
require_once('call_node.php');

async_start();

$activity_updates = isset($_POST['activity_updates'])
  ? $_POST['activity_updates']
  : array();

// For some reason, bools get stringified
$unstringified_activity_updates = array();
foreach ($activity_updates as $activity_update) {
  if (isset($activity_update['focus'])) {
    $activity_update['focus'] = $activity_update['focus'] === "true";
  }
  if (isset($activity_update['closing'])) {
    $activity_update['closing'] = $activity_update['closing'] === "true";
  }
  $unstringified_activity_updates[] = $activity_update;
}

$result = call_node('update_activity', $unstringified_activity_updates);

if (isset($result['error'])) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

async_end(array(
  'success' => true,
  'set_unfocused_to_unread' => $result['unfocusedToUnread'],
));
