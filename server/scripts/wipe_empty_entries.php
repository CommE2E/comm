<?php

require_once('../config.php');

$result = $conn->query(
  "SELECT r.id, r.entry FROM revisions r ".
    "LEFT JOIN entries e ON e.id = r.entry WHERE TRIM(e.text) = ''"
);
$entries = array();
while ($row = $result->fetch_assoc()) {
  $entry_id = intval($row['entry']);
  $entries[$entry_id] = $entry_id;
  $revision_id = intval($row['id']);
  echo "Deleting revision #$revision_id...\n";
  $conn->query("DELETE FROM revisions WHERE id = ".$revision_id);
  $conn->query("DELETE FROM ids WHERE id = ".$revision_id);
}
foreach ($entries as $entry_id) {
  echo "Deleting entry #$entry_id...\n";
  $conn->query("DELETE FROM entries WHERE id = ".$entry_id);
  $conn->query("DELETE FROM ids WHERE id = ".$entry_id);
}
