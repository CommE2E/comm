<?php

require_once('config.php');
require_once('permissions.php');

function get_date_string($day, $month, $year) {
  return date('Y-m-d', strtotime("$month/$day/$year"));
}

function get_editable_day_id($thread, $date_string) {
  global $conn;

  if (!$date_string || !$thread) {
    return null;
  }

  if (!check_thread_permission($thread, PERMISSION_EDIT_ENTRIES)) {
    return null;
  }

  $result = $conn->query(
    "SELECT id FROM days WHERE date = '$date_string' AND thread = $thread"
  );
  $existing_row = $result->fetch_assoc();
  if ($existing_row) {
    return intval($existing_row['id']);
  }

  $conn->query("INSERT INTO ids(table_name) VALUES('days')");
  $new_day_id = $conn->insert_id;
  $conn->query(
    "INSERT INTO days(id, date, thread) ".
      "VALUES ($new_day_id, '$date_string', $thread)"
  );
  if ($conn->errno === 0) {
    return $new_day_id;
  } else if ($conn->errno === 1062) {
    // There's a race condition that can happen if two people start editing
    // the same date at the same time, and two IDs are created for the same
    // row. If this happens, the UNIQUE constraint `date_thread` should be
    // triggered on the second racer, and for that execution path our last
    // query will have failed. We will recover by re-querying for the ID here,
    // and deleting the extra ID we created from the `ids` table.
    $result = $conn->query(
      "SELECT id FROM days WHERE date = '$date_string' AND thread = $thread"
    );
    $existing_row = $result->fetch_assoc();
    $conn->query("DELETE FROM ids WHERE id = $new_day_id");
    return intval($existing_row['id']);
  }

  return null;
}
