<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('day_lib.php');
require_once('permissions.php');
require_once('message_lib.php');

async_start();

$entry_id = isset($_POST['entry_id']) ? intval($_POST['entry_id']) : -1;
if ($entry_id === -1) {
  if (
    !isset($_POST['day']) ||
    !isset($_POST['month']) ||
    !isset($_POST['year']) ||
    !isset($_POST['thread'])
  ) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
  $day = intval($_POST['day']);
  $month = intval($_POST['month']);
  $year = intval($_POST['year']);
  $date_string = get_date_string($day, $month, $year);
  $thread = intval($_POST['thread']);
  // For the case of a new entry, the privacy check to make sure that the user
  // is allowed to edit this thread happens here
  $day_id = get_editable_day_id($thread, $date_string);
} else {
  $query = <<<SQL
SELECT e.day, e.deleted, d.thread, d.date
FROM entries e
LEFT JOIN days d ON d.id = e.day
WHERE e.id = {$entry_id}
SQL;
  $result = $conn->query($query);
  $entry_row = $result->fetch_assoc();
  if (!$entry_row) {
    async_end(array(
      'error' => 'invalid_parameters',
    ));
  }
  if ($entry_row['deleted']) {
    async_end(array(
      'error' => 'entry_deleted',
    ));
  }
  $day_id = intval($entry_row['day']);
  $thread = intval($entry_row['thread']);
  $date_string = $entry_row['date'];
  // For the case of an existing entry, the privacy check to make sure that the
  // user is allowed to edit this thread (and entry) happens here
  if (!check_thread_permission_for_entry($entry_id, PERMISSION_EDIT_ENTRIES)) {
    $day_id = false;
  }
}
if (!$day_id) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

if (
  !isset($_POST['timestamp']) ||
  !isset($_POST['text']) ||
  !isset($_POST['session_id'])
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$timestamp = intval($_POST['timestamp']);
$raw_text = $_POST['text'];
$text = $conn->real_escape_string($raw_text);
$session_id = $conn->real_escape_string($_POST['session_id']);

$viewer_id = get_viewer_id();
if ($entry_id === -1) {
  $conn->query("INSERT INTO ids(table_name) VALUES('entries')");
  $entry_id = $conn->insert_id;
  $conn->query(
    "INSERT INTO entries(id, day, text, creator, creation_time, last_update, ".
      "deleted) VALUES ($entry_id, $day_id, '$text', $viewer_id, $timestamp, ".
      "$timestamp, 0)"
  );

  $conn->query("INSERT INTO ids(table_name) VALUES('revisions')");
  $revision_id = $conn->insert_id;
  $conn->query(
    "INSERT INTO revisions(id, entry, author, text, creation_time, ".
      "session_id, last_update, deleted) VALUES ($revision_id, $entry_id, ".
      "$viewer_id, '$text', $timestamp, '$session_id', $timestamp, 0)"
  );

  $message_info = array(
    'type' => MESSAGE_TYPE_CREATE_ENTRY,
    'threadID' => (string)$thread,
    'creatorID' => (string)$viewer_id,
    'time' => $timestamp,
    'entryID' => (string)$entry_id,
    'date' => $date_string,
    'text' => $raw_text,
  );
  $new_message_infos = create_message_infos(array($message_info));

  async_end(array(
    'success' => true,
    'entry_id' => (string)$entry_id,
    'new_message_infos' => $new_message_infos,
  ));
}

$result = $conn->query(
  "SELECT r.id, r.author, r.text, r.session_id, ".
    "r.last_update, r.deleted, e.text AS entry_text ".
    "FROM revisions r LEFT JOIN entries e ON r.entry = e.id ".
    "WHERE r.entry = $entry_id ORDER BY r.last_update DESC LIMIT 1"
);
$last_revision_row = $result->fetch_assoc();
if (!$last_revision_row) {
  async_end(array(
    'error' => 'unknown_error',
  ));
}
if (
  $last_revision_row['deleted'] ||
  $last_revision_row['text'] !== $last_revision_row['entry_text']
) {
  async_end(array(
    'error' => 'database_corruption',
  ));
}

$multi_query = "UPDATE entries SET last_update = $timestamp, ".
  "text = '$text' WHERE id = $entry_id; ";
if (
  $viewer_id === intval($last_revision_row['author']) &&
  $session_id === $last_revision_row['session_id'] &&
  intval($last_revision_row['last_update']) + 120000 > $timestamp
) {
  $revision_id = $last_revision_row['id'];
  $multi_query .= "UPDATE revisions SET last_update = $timestamp, ".
    "text = '$text' WHERE id = $revision_id;";
} else if (
  $session_id !== $last_revision_row['session_id'] &&
  $_POST['prev_text'] !== $last_revision_row['text']
) {
  async_end(array(
    'error' => 'concurrent_modification',
    'db' => $last_revision_row['text'],
    'ui' => $_POST['prev_text'],
  ));
} else if (intval($last_revision_row['last_update']) >= $timestamp) {
  async_end(array(
    'error' => 'old_timestamp',
    'old_time' => intval($last_revision_row['last_update']),
    'new_time' => $timestamp,
  ));
} else {
  $conn->query("INSERT INTO ids(table_name) VALUES('revisions')");
  $revision_id = $conn->insert_id;
  $multi_query .=
    "INSERT INTO revisions(id, entry, author, text, creation_time, ".
      "session_id, last_update, deleted) VALUES ($revision_id, $entry_id, ".
      "$viewer_id, '$text', $timestamp, '$session_id', $timestamp, 0);";
}
$conn->multi_query($multi_query);

async_end(array(
  'success' => true,
  'entry_id' => (string)$entry_id,
  'new_message_infos' => array(),
));
