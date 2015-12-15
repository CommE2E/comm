<?php

header("Content-Type: application/json");

$timestamp = intval($_POST['timestamp']);
$day = intval($_POST['day']);
$month = intval($_POST['month']);
$year = intval($_POST['year']);
$date = date('Y-m-d', strtotime("$month/$day/$year"));

$conn = new mysqli(
  "localhost",
  "tevosyan_squad",
  "nvm2xn",
  "tevosyan_squadcal"
);

$text = $conn->real_escape_string($_POST['text']);
$session_id = $conn->real_escape_string($_POST['session_id']);

$result = $conn->query("SELECT text, session_id, last_update FROM days WHERE day='$date'");
$old_row = $result->fetch_assoc();
if ($old_row) {
  if ($session_id !== $old_row['session_id'] && $_POST['prev_text'] !== $old_row['text']) {
    exit(json_encode(array(
      'error' => 'concurrent_modification',
      'db' => $old_row['text'],
      'ui' => $_POST['prev_text'],
    )));
  }
  if (intval($old_row['last_update']) >= $timestamp) {
    exit(json_encode(array(
      'error' => 'old_timestamp',
      'old_time' => intval($old_row['last_update']),
      'new_time' => $timestamp,
    )));
  }
}

$conn->query(
  "INSERT INTO days(day, text, session_id, last_update) " .
  "VALUES ('$date', '$text', '$session_id', '$timestamp') " .
  "ON DUPLICATE KEY UPDATE day = VALUES(day), text = VALUES(text), " .
    "session_id = VALUES(session_id), last_update = VALUES(last_update)"
);

exit(json_encode(array(
  'success' => true,
  'new_time' => $timestamp,
)));
