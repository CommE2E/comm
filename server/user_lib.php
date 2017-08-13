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

function combine_keyed_user_info_arrays(...$user_info_arrays) {
  return array_values(array_merge(...$user_info_arrays));
}

function get_user_info() {
  global $conn;

  $viewer_id = get_viewer_id();
  $user_logged_in = user_logged_in();

  if (!$user_logged_in) {
    return array(
      'id' => (string)$viewer_id,
      'anonymous' => true,
    );
  }

  $query = <<<SQL
SELECT username, email, email_verified FROM users WHERE id = {$viewer_id}
SQL;
  $result = $conn->query($query);
  $user_row = $result->fetch_assoc();
  if (!$user_row) {
    return null;
  }
  return array(
    'id' => (string)$viewer_id,
    'username' => $user_row['username'],
    'email' => $user_row['email'],
    'email_verified' => (bool)$user_row['email_verified'],
  );
}
