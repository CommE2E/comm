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
$existing_row = null;
$already_updated_days = false;
if ($day_id === null) {
  // Check if the row and ID are already created
  $result = $conn->query(
    "SELECT id, text, session_id, last_update FROM days ".
      "WHERE date = '$date' AND squad = $squad"
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
      "INSERT INTO days(id, date, squad, text, session_id, last_update) ".
        "VALUES ($new_day_id, '$date', $squad, ".
        "'$text', '$session_id', $timestamp)"
    );
    if ($conn->errno === 0) {
      $day_id = $new_day_id;
      $already_updated_days = true;
    } else if ($conn->errno === 1062) {
      // There's a race condition that can happen if two people start editing
      // the same date at the same time, and two IDs are created for the same
      // row. If this happens, the UNIQUE constraint `date_squad` should be
      // triggered on the second racer, and for that execution path our last
      // query will have failed. We will recover by re-querying for the ID here,
      // and deleting the extra ID we created from the `ids` table.
      $result = $conn->query(
        "SELECT id, text, session_id, last_update FROM days ".
          "WHERE date = '$date' AND squad = $squad"
      );
      $existing_row = $result->fetch_assoc();
      $day_id = $existing_row['id'];
      $conn->query("DELETE FROM ids WHERE id = $new_day_id");
    }
  }
  if (!$already_updated_days && $existing_row === null) {
    exit(json_encode(array(
      'error' => 'unknown_error',
    )));
  }
} else {
  // We need to check the current row to look for concurrent modification
  $result = $conn->query(
    "SELECT text, session_id, last_update FROM days WHERE `id` = $day_id"
  );
  $existing_row = $result->fetch_assoc();
  if ($existing_row === null) {
    exit(json_encode(array(
      'error' => 'invalid_parameters',
    )));
  }
}

if (!$already_updated_days) {
  // Once we get here, we are guaranteed that a row exists
  // We must check it for concurrent modification
  if (
    $session_id !== $existing_row['session_id'] &&
    $_POST['prev_text'] !== $existing_row['text']
  ) {
    exit(json_encode(array(
      'error' => 'concurrent_modification',
      'db' => $existing_row['text'],
      'ui' => $_POST['prev_text'],
    )));
  }
  if (intval($existing_row['last_update']) >= $timestamp) {
    exit(json_encode(array(
      'error' => 'old_timestamp',
      'old_time' => intval($existing_row['last_update']),
      'new_time' => $timestamp,
    )));
  }

  // We have confirmed that there is no concurrent modification
  // We will now update the row
  $conn->query(
    "UPDATE days SET text = '$text', session_id = '$session_id', " .
      "last_update = $timestamp ".
      "WHERE id = $day_id"
  );
}

// After this, we need to:
// - Move the UI over to displaying first entry
// - Kill the text field on days (simultaneous code push and SQL table deletion)
// - As part of that, kill all the complex text-updating logic for days
// - Pass the current entry ID down from server in index.php, and back up to server in save.php
// - Update save.php to look at passed-in entry ID. For now it will error out if no ID passed but an entry exists
// - Make the UI actually show different entries, and let people create new ones
// - No longer error out if no entry ID passed but an entry already exist

// For now, we never get an entry_id, and always just use the first connected
// entry
$result = $conn->query("SELECT id FROM entries WHERE day = $day_id");
$entry_row = $result->fetch_assoc();
if (!$entry_row) {
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
  $entry_id = $entry_row['id'];
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
