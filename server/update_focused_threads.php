<?php

require_once('async_lib.php');
require_once('thread_lib.php');

async_start();

$focus_commands = isset($_POST['focus_commands'])
  ? $_POST['focus_commands']
  : array();
$result = update_focused_threads($focus_commands);
if (!$result) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

async_end(array(
  'success' => true,
));
