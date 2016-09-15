<?php

require_once('config.php');
require_once('auth.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  exit(json_encode(array(
    'error' => 'tls_failure',
  )));
}

// Either we're given an ID, indicating that a row for this date/squad pair
// already exists, or we're given a date/squad pair to create a new row with.
if (isset($_POST['id'])) {
  $day_id = intval($_POST['id']);
  $date = null;
  $squad = null;
} else {
  $day_id = null;
  if (
    !isset($_POST['day']) ||
    !isset($_POST['month']) ||
    !isset($_POST['year']) ||
    !isset($_POST['squad'])
  ) {
    exit(json_encode(array('error' => 'invalid_parameters')));
  }
  $day = intval($_POST['day']);
  $month = intval($_POST['month']);
  $year = intval($_POST['year']);
  $date = date('Y-m-d', strtotime("$month/$day/$year"));
  $squad = intval($_POST['squad']);
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
$entry_id = isset($_POST['entry_id']) ? intval($_POST['entry_id']) : -1;

if ($day_id === null && ($date === null || $squad === 0)) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

// First, make sure the squad exists and we're a member
$viewer_id = get_viewer_id();
$result = $conn->query(
  "SELECT sq.name, sq.hash IS NOT NULL AND su.squad IS NULL AS requires_auth ".
    "FROM squads sq LEFT JOIN subscriptions su ".
    "ON sq.id = su.squad AND su.subscriber = {$viewer_id} ".
    "WHERE sq.id = $squad"
);
$squad_row = $result->fetch_assoc();
if ((bool)$squad_row['requires_auth']) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

// This block ends one of two ways:
// - Either there is no existing row for the given date/squad pair, in which
//   case we will simply create it and exit, or
// - There is already a row for the given date/squad pair, and we will continue
//   past this block in order to check for concurrent modification
if ($day_id === null) {
  // Check if the row and ID are already created
  $result = $conn->query(
    "SELECT id FROM days WHERE date = '$date' AND squad = $squad"
  );
  $existing_row = $result->fetch_assoc();
  if ($existing_row) {
    $day_id = $existing_row['id'];
  } else {
    // Okay, create the ID first
    $conn->query("INSERT INTO ids(table_name) VALUES('days')");
    $new_day_id = $conn->insert_id;
    // Now create the row in the `days` table
    $conn->query(
      "INSERT INTO days(id, date, squad) VALUES ($new_day_id, '$date', $squad)"
    );
    if ($conn->errno === 0) {
      $day_id = $new_day_id;
    } else if ($conn->errno === 1062) {
      // There's a race condition that can happen if two people start editing
      // the same date at the same time, and two IDs are created for the same
      // row. If this happens, the UNIQUE constraint `date_squad` should be
      // triggered on the second racer, and for that execution path our last
      // query will have failed. We will recover by re-querying for the ID here,
      // and deleting the extra ID we created from the `ids` table.
      $result = $conn->query(
        "SELECT id FROM days WHERE date = '$date' AND squad = $squad"
      );
      $existing_row = $result->fetch_assoc();
      $day_id = $existing_row['id'];
      $conn->query("DELETE FROM ids WHERE id = $new_day_id");
    }
  }
} else {
  // We need to make sure the day ID actually exists
  $result = $conn->query("SELECT id FROM days WHERE `id` = $day_id");
  $existing_row = $result->fetch_assoc();
  if ($existing_row === null) {
    exit(json_encode(array(
      'error' => 'invalid_parameters',
    )));
  }
}

if ($entry_id === -1) {
  // This check is temporary. It will eventually be possible to have multiple
  // entries per day. However, at this time that's not possible, so we error out
  $result = $conn->query("SELECT id FROM entries WHERE day = $day_id");
  $entry_row = $result->fetch_assoc();
  if ($entry_row) {
    exit(json_encode(array(
      'error' => 'duplicate_entry',
    )));
  }
  $conn->query("INSERT INTO ids(table_name) VALUES('entries')");
  $entry_id = $conn->insert_id;
  $conn->query(
    "INSERT INTO entries(id, day, text, creator, creation_time, last_update) ".
      "VALUES ($entry_id, $day_id, '$text', $viewer_id, $timestamp, $timestamp)"
  );
  $conn->query("INSERT INTO ids(table_name) VALUES('revisions')");
  $revision_id = $conn->insert_id;
  $conn->query(
    "INSERT INTO revisions(id, entry, author, text, creation_time, ".
      "session_id, last_update) VALUES ($revision_id, $entry_id, $viewer_id, ".
      "'$text', $timestamp, '$session_id', $timestamp)"
  );
} else {
  $result = $conn->query(
    "SELECT id, author, text, session_id, last_update FROM revisions ".
      "WHERE entry = $entry_id ORDER BY last_update DESC LIMIT 1"
  );
  $last_revision_row = $result->fetch_assoc();
  if (!$last_revision_row) {
    exit(json_encode(array(
      'error' => 'unknown_error',
    )));
  }
  if (
    $viewer_id === intval($last_revision_row['author']) &&
    $session_id === $last_revision_row['session_id'] &&
    intval($last_revision_row['last_update']) + 120000 > $timestamp
  ) {
    $revision_id = $last_revision_row['id'];
    $conn->query(
      "UPDATE revisions SET last_update = $timestamp, text = '$text' ".
        "WHERE id = $revision_id"
    );
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
    $conn->query(
      "INSERT INTO revisions(id, entry, author, text, creation_time, ".
        "session_id, last_update) VALUES ($revision_id, $entry_id, ".
        "$viewer_id, '$text', $timestamp, '$session_id', $timestamp)"
    );
  }
  $conn->query(
    "UPDATE entries SET last_update = $timestamp, text = '$text' ".
      "WHERE id = $entry_id"
  );
}

exit(json_encode(array(
  'success' => true,
  'day_id' => $day_id,
  'new_time' => $timestamp,
)));
