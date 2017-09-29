<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('message_lib.php');

async_start();

if (!isset($_POST['thread']) || !isset($_POST['text'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$thread = (int)$_POST['thread'];

$can_edit = viewer_can_edit_thread($thread);
if ($can_edit === null) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
if (!$can_edit) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

$message_info = array(
  'type' => MESSAGE_TYPE_TEXT,
  'threadID' => (string)$thread,
  'creatorID' => (string)get_viewer_id(),
  'time' => round(microtime(true) * 1000), // in milliseconds
  'text' => $_POST['text'],
);
$new_message_infos = create_message_infos(array($message_info));
if ($new_message_infos === null) {
  async_end(array(
    'error' => 'unknown_error',
  ));
}

async_end(array(
  'success' => true,
  'new_message_infos' => $new_message_infos,
));
