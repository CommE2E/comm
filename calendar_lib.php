<?php

require_once('config.php');
require_once('auth.php');

function get_calendar_infos($viewer_id) {
  global $conn;
  $result = $conn->query(
    "SELECT c.id, c.name, r.role, c.hash IS NOT NULL AS requires_auth, ".
      "r.calendar IS NOT NULL AND r.role >= ".ROLE_SUCCESSFUL_AUTH." ".
      "AS is_authed, r.subscribed, c.color, c.description, c.edit_rules ".
      "FROM calendars c ".
      "LEFT JOIN roles r ON r.calendar = c.id AND r.user = {$viewer_id}"
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
      'canChangeSettings' => (int)$row['role'] >= ROLE_CREATOR,
      'closed' => (bool)$row['requires_auth'],
      'color' => $row['color'],
      'editRules' => (int)$row['edit_rules'],
    );
  }
  return $calendar_infos;
}
