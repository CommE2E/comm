<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');

async_start();

if (!isset($_POST['thread']) || !isset($_POST['text'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$thread = (int)$_POST['thread'];
$text = $conn->real_escape_string($_POST['text']);

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

$viewer_id = get_viewer_id();
$time = round(microtime(true) * 1000); // in milliseconds

$conn->query("INSERT INTO ids(table_name) VALUES('messages')");
$id = $conn->insert_id;
$conn->query(
  "INSERT INTO messages(id, thread, user, text, time) ".
    "VALUES ($id, $thread, $viewer_id, '$text', $time)"
);

async_end(array(
  'success' => true,
  'result' => array(
    'id' => (string)$id,
    'time' => $time,
  ),
));
