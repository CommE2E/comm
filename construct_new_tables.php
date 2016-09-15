<?php

require_once('config.php');

$result = $conn->query(
  "SELECT d.id AS day_id, d.text, d.last_update, d.session_id, ".
    "e.id AS entry_id FROM days d LEFT JOIN entries e ON e.day = d.id "
);
while ($row = $result->fetch_assoc()) {
  if ($row['entry_id']) {
    echo "Skipping day #".$row['day_id']."\n";
    continue;
  }
  $conn->query("INSERT INTO ids(table_name) VALUES('entries')");
  $entry_id = $conn->insert_id;
  $conn->query(
    "INSERT INTO entries(id, day, text, creator, creation_time, last_update) ".
      "VALUES ($entry_id, $row[day_id], '$row[text]', 256, $row[last_update], ".
      "$row[last_update])"
  );
  echo "Created entry #".$entry_id." for day #".$row['day_id']."\n";
  $conn->query("INSERT INTO ids(table_name) VALUES('revisions')");
  $revision_id = $conn->insert_id;
  $conn->query(
    "INSERT INTO revisions(id, entry, author, text, creation_time, ".
      "session_id, last_update) VALUES ($revision_id, $entry_id, 256, ".
      "'$row[text]', $row[last_update], '$row[session_id]', $row[last_update])"
  );
  echo "Created revision #".$revision_id." for day #".$row['day_id']."\n";
}
