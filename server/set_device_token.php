<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');

async_start();

if (
  !isset($_POST['device_token']) ||
  !isset($_POST['device_type']) ||
  ($_POST['device_type'] !== "ios" && $_POST['device_type'] !== "android")
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$device_token = $conn->real_escape_string($_POST['device_token']);
$column = $_POST['device_type'] === "ios"
  ? "ios_device_token"
  : "android_device_token";
list($viewer_id, $is_user, $cookie_id) = get_viewer_info();

$query = <<<SQL
UPDATE cookies SET {$column} = '{$device_token}' WHERE id = {$cookie_id}
SQL;
$conn->query($query);

async_end(array(
  'success' => true,
));
