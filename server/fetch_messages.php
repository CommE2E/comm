<?php

require_once('async_lib.php');
require_once('message_lib.php');

async_start();

$input = isset($_POST['input']) ? $_POST['input'] : null;
$number_per_thread = isset($_POST['number_per_thread'])
  ? (int)$_POST['number_per_thread']
  : DEFAULT_NUMBER_PER_THREAD;

list($message_infos, $truncation_status) =
  get_message_infos($input, $number_per_thread);

async_end(array(
  'success' => true,
  'message_infos' => $message_infos,
  'truncation_status' => $truncation_status,
));
