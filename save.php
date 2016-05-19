<?php

require_once('config.php');
require_once('auth.php');

header("Content-Type: application/json");

// Either we're given an ID, indicating that a row for this date/squad pair
// already exists, or we're given a date/squad pair to create a new row with.
if (isset($_POST['id'])) {
  $id = intval($_POST['id']);
  $date = null;
  $squad = null;
} else {
  $id = null;
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

if ($id === null && ($date === null || $squad === 0)) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}

// First, make sure the squad exists and we're a member
list($cookie_id, $cookie_hash) = init_anonymous_cookie();
$conn->query(
  $result = $conn->query(
    "SELECT squad FROM subscriptions ".
      "WHERE squad = $squad AND subscriber = $cookie_id"
  );
  $subscription_row = $result->fetch_assoc();
  if (!$subscription_row) {
    exit(json_encode(array(
      'error' => 'invalid_credentials',
    )));
  }
}

// This block ends one of two ways:
// - Either there is no existing row for the given date/squad pair, in which
//   case we will simply create it and exit, or
// - There is already a row for the given date/squad pair, and we will continue
//   past this block in order to check for concurrent modification
$existing_row = null;
if ($id === null) {
  // Check if the row and ID are already created
  $result = $conn->query(
    "SELECT id, text, session_id, last_update FROM days ".
      "WHERE date='$date' AND squad=$squad"
  );
  $existing_row = $result->fetch_assoc();
  if (!$existing_row) {
    // Okay, create the ID first
    $result = $conn->query("INSERT INTO ids(table_name) VALUES('days')");
    $new_id = $conn->insert_id;
    // Now create the row in the `days` table
    $conn->query(
      "INSERT INTO days(id, date, squad, text, session_id, last_update) ".
        "VALUES ($new_id, '$date', $squad, '$text', '$session_id', $timestamp)"
    );
    if ($conn->errno === 0) {
      exit(json_encode(array(
        'success' => true,
        'id' => $new_id,
        'new_time' => $timestamp,
      )));
    }
    // There's a race condition that can happen if two people start editing the
    // same date at the same time, and two IDs are created for the same row. If
    // this happens, the UNIQUE constraint `date_squad` should be triggered on the
    // second racer, and for that execution path our last query will have failed.
    // We will recover by re-querying for the ID here, and deleting the extra ID
    // we created from the `ids` table.
    if ($conn->errno === 1062) {
      $result = $conn->query(
        "SELECT id, text, session_id, last_update FROM days ".
          "WHERE date='$date' AND squad=$squad"
      );
      $existing_row = $result->fetch_assoc();
      $conn->query("DELETE FROM ids WHERE id=$new_id");
    }
  }
  if ($existing_row === null) {
    exit(json_encode(array(
      'error' => 'unknown_error',
    )));
  }
  $id = $existing_row['id'];
} else {
  // We need to check the current row to look for concurrent modification
  $result = $conn->query(
    "SELECT text, session_id, last_update FROM days WHERE `id`=$id"
  );
  $existing_row = $result->fetch_assoc();
  if ($existing_row === null) {
    exit(json_encode(array(
      'error' => 'invalid_parameters',
    )));
  }
}

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
    "WHERE id = $id"
);

exit(json_encode(array(
  'success' => true,
  'id' => $id,
  'new_time' => $timestamp,
)));
