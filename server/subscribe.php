<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('permissions.php');

async_start();

if (!isset($_POST['thread']) || !isset($_POST['subscribe'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$thread = (int)$_POST['thread'];
$new_subscribed = !!$_POST['subscribe'];

if (!viewer_is_member($thread)) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$viewer_id = get_viewer_id();
$query = <<<SQL
UPDATE roles
SET subscribed = {$new_subscribed}
WHERE thread = {$thread} AND user = {$viewer_id}
SQL;
$conn->query($query);

async_end(array(
  'success' => true,
));
