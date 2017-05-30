<?php

require_once('async_lib.php');
require_once('message_lib.php');

async_start();

$input = isset($_GET['input']) ? $_GET['input'] : null;
$number_per_thread = isset($_GET['number_per_thread'])
  ? (int)$_GET['number_per_thread']
  : 10;

$messages = get_message_infos($input, $number_per_thread);

async_end(array(
  'success' => true,
  'result' => $messages,
));
