<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');

async_start();

if (
  !isset($_POST['id']) ||
  !isset($_POST['timestamp']) ||
  !isset($_POST['session_id'])
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$id = intval($_POST['id']);
$timestamp = intval($_POST['timestamp']);
$session_id = $conn->real_escape_string($_POST['session_id']);

$can_see = viewer_can_edit_entry($id);
if ($can_see === null) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
if (!$can_see) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

$result = $conn->query(
  "SELECT r.id, r.author, r.text, r.session_id, r.last_update, r.deleted ".
    "FROM revisions r LEFT JOIN entries e ON r.entry = e.id ".
    "LEFT JOIN days d ON d.id = e.day ".
    "WHERE r.entry = $id ORDER BY r.last_update DESC LIMIT 1"
);
$last_revision_row = $result->fetch_assoc();
if (!$last_revision_row) {
  async_end(array(
    'error' => 'unknown_error',
  ));
}
if (!$last_revision_row['deleted']) {
  async_end(array(
    'error' => 'entry_not_deleted',
  ));
}
$text = $conn->real_escape_string($last_revision_row['text']);
$viewer_id = get_viewer_id();

$conn->query("INSERT INTO ids(table_name) VALUES('revisions')");
$revision_id = $conn->insert_id;
$conn->query(
  "INSERT INTO revisions(id, entry, author, text, creation_time, ".
    "session_id, last_update, deleted) VALUES ($revision_id, $id, ".
    "$viewer_id, '$text', $timestamp, '$session_id', $timestamp, 0)"
);
$conn->query("UPDATE entries SET deleted = 0 WHERE id = $id");

async_end(array(
  'success' => true,
));
