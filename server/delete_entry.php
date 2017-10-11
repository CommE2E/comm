<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('permissions.php');

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
  "SELECT id, author, text, session_id, last_update, deleted FROM revisions ".
    "WHERE entry = $id ORDER BY last_update DESC LIMIT 1"
);
$last_revision_row = $result->fetch_assoc();
if (!$last_revision_row) {
  async_end(array(
    'error' => 'unknown_error',
  ));
}
if ($last_revision_row['deleted']) {
  async_end(array(
    'error' => 'entry_deleted',
  ));
}
$text = $last_revision_row['text'];
$viewer_id = get_viewer_id();

if (
  $session_id !== $last_revision_row['session_id'] &&
  $_POST['prev_text'] !== $text
) {
  async_end(array(
    'error' => 'concurrent_modification',
    'db' => $text,
    'ui' => $_POST['prev_text'],
  ));
} else if (intval($last_revision_row['last_update']) >= $timestamp) {
  async_end(array(
    'error' => 'old_timestamp',
    'old_time' => intval($last_revision_row['last_update']),
    'new_time' => $timestamp,
  ));
}

$escaped_text = $conn->real_escape_string($text);
$conn->query("INSERT INTO ids(table_name) VALUES('revisions')");
$revision_id = $conn->insert_id;
$conn->query(
  "INSERT INTO revisions(id, entry, author, text, creation_time, ".
    "session_id, last_update, deleted) VALUES ($revision_id, $id, ".
    "$viewer_id, '$escaped_text', $timestamp, '$session_id', $timestamp, 1)"
);
$conn->query("UPDATE entries SET deleted = 1 WHERE id = $id");

async_end(array(
  'success' => true,
));
