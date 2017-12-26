<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');

async_start();

if (!isset($_POST['device_token'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$device_token = $conn->real_escape_string($_POST['device_token']);

list($viewer_id, $is_user, $cookie_id) = get_viewer_info();

$query = <<<SQL
UPDATE cookies SET device_token = {$device_token} WHERE id = {$cookie_id}
SQL;
$conn->query($query);

async_end(array(
  'success' => true,
));
