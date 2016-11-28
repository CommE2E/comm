<?php

require_once('config.php');
require_once('auth.php');

function get_calendar_infos($viewer_id) {
  global $conn;
  $result = $conn->query(
    "SELECT s.id, s.name, r.role, s.hash IS NOT NULL AS requires_auth, ".
      "r.squad IS NOT NULL AND r.role >= ".ROLE_SUCCESSFUL_AUTH." AS is_authed, ".
      "r.subscribed, s.color, s.description FROM squads s ".
      "LEFT JOIN roles r ON r.squad = s.id AND r.user = {$viewer_id}"
  );
  $calendar_infos = array();
  while ($row = $result->fetch_assoc()) {
    $authorized = $row['is_authed'] || !$row['requires_auth'];
    $subscribed_authorized = $authorized && $row['subscribed'];
    $calendar_infos[$row['id']] = array(
      'id' => $row['id'],
      'name' => $row['name'],
      'description' => $row['description'],
      'authorized' => $authorized,
      'subscribed' => $subscribed_authorized,
      'editable' => (int)$row['role'] >= ROLE_CREATOR,
      'closed' => (bool)$row['requires_auth'],
      'color' => $row['color'],
    );
  }
  return $calendar_infos;
}
