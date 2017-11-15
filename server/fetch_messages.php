<?php

require_once('async_lib.php');
require_once('message_lib.php');

async_start();

$input = isset($_POST['input']) ? $_POST['input'] : null;
$number_per_thread = isset($_POST['number_per_thread'])
  ? (int)$_POST['number_per_thread']
  : DEFAULT_NUMBER_PER_THREAD;

$thread_selection_criteria = array("thread_ids" => $input);
$message_result = get_message_infos(
  $thread_selection_criteria,
  $number_per_thread
);
if (!$message_result) {
  async_end(array(
    'error' => 'internal_error',
  ));
}
list($message_infos, $truncation_status, $users) = $message_result;

async_end(array(
  'success' => true,
  'message_infos' => $message_infos,
  'truncation_status' => $truncation_status,
  'user_infos' => array_values($users),
));
