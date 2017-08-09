<?php

require_once('auth.php');

// $user_ids is a string of implode'd user IDs
// returns an array of validated user IDs
function verify_user_ids($user_ids) {
  global $conn;

  // Be careful with the regex below; bad validation could lead to SQL injection
  if (!preg_match('/^(([0-9]+,)*([0-9]+))?$/', $user_ids)) {
    return array();
  }

  $result = $conn->query("SELECT id FROM users WHERE id IN ({$user_ids})");
  $verified_user_ids = array();
  while ($row = $result->fetch_assoc()) {
    $verified_user_ids[] = (int)$row['id'];
  }
  return $verified_user_ids;
}
