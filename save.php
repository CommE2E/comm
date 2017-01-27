<?php

require_once('config.php');
require_once('auth.php');
require_once('day_lib.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}

$entry_id = isset($_POST['entry_id']) ? intval($_POST['entry_id']) : -1;
if ($entry_id === -1) {
  if (
    !isset($_POST['day']) ||
    !isset($_POST['month']) ||
    !isset($_POST['year']) ||
    !isset($_POST['calendar'])
  ) {
    exit(json_encode(array(
      'error' => 'invalid_parameters',
    )));
  }
  $day = intval($_POST['day']);
  $month = intval($_POST['month']);
  $year = intval($_POST['year']);
  $calendar = intval($_POST['calendar']);
  // For the case of a new entry, the privacy check to make sure that the user
  // is allowed to edit this calendar happens here
  $day_id = get_editable_day_id($calendar, $day, $month, $year);
} else {
  $result = $conn->query(
    "SELECT day, deleted, text FROM entries WHERE id = $entry_id"
  );
  $entry_row = $result->fetch_assoc();
  if (!$entry_row) {
    exit(json_encode(array(
      'error' => 'invalid_parameters',
    )));
  }
  if ($entry_row['deleted']) {
    exit(json_encode(array(
      'error' => 'entry_deleted',
    )));
  }
  $day_id = intval($entry_row['day']);
  // For the case of an existing entry, the privacy check to make sure that the
  // user is allowed to edit this calendar (and entry) happens here
  $can_edit = viewer_can_edit_entry($entry_id);
  if (!$can_edit) {
    $day_id = $can_edit;
  }
}
if ($day_id === null) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
if (!$day_id) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

if (
  !isset($_POST['timestamp']) ||
  !isset($_POST['text']) ||
  !isset($_POST['session_id'])
) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$timestamp = intval($_POST['timestamp']);
$text = $conn->real_escape_string($_POST['text']);
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
  exit(json_encode(array(
    'success' => true,
    'day_id' => $day_id,
    'entry_id' => $entry_id,
    'new_time' => $timestamp,
  )));
}

$result = $conn->query(
  "SELECT id, author, text, session_id, last_update, deleted FROM revisions ".
    "WHERE entry = $entry_id ORDER BY last_update DESC LIMIT 1"
);
$last_revision_row = $result->fetch_assoc();
if (!$last_revision_row) {
  exit(json_encode(array(
    'error' => 'unknown_error',
  )));
}
if (
  $last_revision_row['deleted'] ||
  $last_revision_row['text'] !== $entry_row['text']
) {
  exit(json_encode(array(
    'error' => 'database_corruption',
  )));
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
  exit(json_encode(array(
    'error' => 'concurrent_modification',
    'db' => $last_revision_row['text'],
    'ui' => $_POST['prev_text'],
  )));
} else if (intval($last_revision_row['last_update']) >= $timestamp) {
  exit(json_encode(array(
    'error' => 'old_timestamp',
    'old_time' => intval($last_revision_row['last_update']),
    'new_time' => $timestamp,
  )));
} else {
  $conn->query("INSERT INTO ids(table_name) VALUES('revisions')");
  $revision_id = $conn->insert_id;
  $multi_query .=
    "INSERT INTO revisions(id, entry, author, text, creation_time, ".
      "session_id, last_update, deleted) VALUES ($revision_id, $entry_id, ".
      "$viewer_id, '$text', $timestamp, '$session_id', $timestamp, 0);";
}
$conn->multi_query($multi_query);

exit(json_encode(array(
  'success' => true,
  'day_id' => $day_id,
  'entry_id' => $entry_id,
  'new_time' => $timestamp,
)));
