<?php

require_once('async_lib.php');
require_once('thread_lib.php');

async_start();

$thread_ids = isset($_POST['focused_threads'])
  ? verify_thread_ids($_POST['focused_threads'])
  : array();

$result = update_focused_threads($thread_ids);
if (!$result) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

async_end(array(
  'success' => true,
));
