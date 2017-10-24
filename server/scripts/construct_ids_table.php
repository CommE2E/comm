<?php

require_once('../config.php');

$tables = array('cookies', 'days', 'squads', 'users');

foreach ($tables as $table) {
  $result = $conn->query("SELECT id FROM $table");
  while ($row = $result->fetch_assoc()) {
    echo $row['id'] . ": " . $table . "\n";
    $conn->query(
      'INSERT INTO `ids`(`id`, `table_name`) '.
        'VALUES ('.$row['id'].', "'.$table.'")'
    );
  }
}
