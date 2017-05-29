<?php

require_once('config.php');
require_once('auth.php');

define("VISIBILITY_OPEN", 0);
define("VISIBILITY_CLOSED", 1);
define("VISIBILITY_SECRET", 2);
define("EDIT_ANYBODY", 0);
define("EDIT_LOGGED_IN", 1);

function get_thread_infos($specific_condition="") {
  global $conn;
  $viewer_id = get_viewer_id();
  $query = "SELECT t.id, t.name, r.role, t.visibility_rules, ".
    "r.thread IS NOT NULL AND r.role >= ".ROLE_SUCCESSFUL_AUTH." ".
    "AS is_authed, r.subscribed, t.color, t.description, t.edit_rules ".
    "FROM threads t ".
    "LEFT JOIN roles r ON r.thread = t.id AND r.user = {$viewer_id}";
  if ($specific_condition) {
    $query .= " WHERE $specific_condition";
  }
  $result = $conn->query($query);
  $thread_infos = array();
  while ($row = $result->fetch_assoc()) {
    $authorized = $row['is_authed'] ||
      (int)$row['visibility_rules'] < VISIBILITY_CLOSED;
    if (!$authorized && (int)$row['visibility_rules'] >= VISIBILITY_SECRET) {
      continue;
    }
    $subscribed_authorized = $authorized && $row['subscribed'];
    $thread_infos[$row['id']] = array(
      'id' => $row['id'],
      'name' => $row['name'],
      'description' => $row['description'],
      'authorized' => $authorized,
      'subscribed' => $subscribed_authorized,
      'canChangeSettings' => (int)$row['role'] >= ROLE_CREATOR,
      'visibilityRules' => (int)$row['visibility_rules'],
      'color' => $row['color'],
      'editRules' => (int)$row['edit_rules'],
    );
  }
  return $thread_infos;
}
