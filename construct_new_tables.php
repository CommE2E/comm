<?php

require_once('config.php');

$result = $conn->query(
  "SELECT d.id AS day_id, ".
    "e.id AS entry_id FROM days d LEFT JOIN entries e ON e.day = d.id "
);
while ($row = $result->fetch_assoc()) {
  if ($row['entry_id']) {
    echo "Skipping entry for day #".$row['day_id']."\n";
  } else {
    $conn->query("INSERT INTO ids(table_name) VALUES('entries')");
    $entry_id = $conn->insert_id;
    $conn->query(
      "INSERT INTO entries(id, day, text, creator, creation_time, last_update) ".
        "VALUES ($entry_id, $row[day_id], '', 256, 0, 0)"
    );
    echo "Created entry #".$entry_id." for day #".$row['day_id']."\n";
  }
  $another_result = $conn->query("SELECT id FROM revisions WHERE entry = $entry_id");
  $another_row = $another_result->fetch_assoc();
  if ($another_row) {
    echo "Skipping revision for day #".$row['day_id']."\n";
  } else {
    $conn->query("INSERT INTO ids(table_name) VALUES('revisions')");
    $revision_id = $conn->insert_id;
    $conn->query(
      "INSERT INTO revisions(id, entry, author, text, creation_time, ".
        "session_id, last_update) VALUES ($revision_id, $entry_id, 256, ".
        "'', 0, '', 0)"
    );
    echo "Created revision #".$revision_id." for day #".$row['day_id']."\n";
  }
}
