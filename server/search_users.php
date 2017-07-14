<?php

require_once('async_lib.php');
require_once('config.php');

async_start();

$prefix_fragment = "";
if (isset($_POST['prefix'])) {
  $prefix_fragment = "WHERE username LIKE '"
    . $conn->real_escape_string($_POST['prefix'])
    . "%' ";
}

$query = "SELECT id, username FROM users {$prefix_fragment}LIMIT 20";
$result = $conn->query($query);

$user_infos = array();
while ($row = $result->fetch_assoc()) {
  $user_infos[] = $row;
}

async_end(array(
  'success' => true,
  'user_infos' => $user_infos,
));
