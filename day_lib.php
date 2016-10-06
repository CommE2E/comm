<?php

require_once('config.php');
require_once('auth.php');

// null if invalid parameters
// false if invalid credentials
function get_day_id($squad, $day, $month, $year) {
  $date = date('Y-m-d', strtotime("$month/$day/$year"));
  if (!$date || !$squad) {
    return null;
  }

  $can_see = viewer_can_see_squad($squad);
  if (!$can_see) {
    // can be null or false, see comment above
    return $can_see;
  }

  $result = $conn->query(
    "SELECT id FROM days WHERE date = '$date' AND squad = $squad"
  );
  $existing_row = $result->fetch_assoc();
  if ($existing_row) {
    return intval($existing_row['id']);
  }

  $conn->query("INSERT INTO ids(table_name) VALUES('days')");
  $new_day_id = $conn->insert_id;
  $conn->query(
    "INSERT INTO days(id, date, squad) VALUES ($new_day_id, '$date', $squad)"
  );
  if ($conn->errno === 0) {
    return $new_day_id;
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
    $conn->query("DELETE FROM ids WHERE id = $new_day_id");
    return intval($existing_row['id']);
  }

  return null;
}
