<?php

require_once('auth.php');

// $user_ids is an array of user IDs as strings
// returns an array of validated user IDs as ints
function verify_user_ids($user_ids) {
  global $conn;

  $int_user_ids = array_map('intval', $user_ids);
  $user_ids_string = implode(",", $int_user_ids);

  $query = <<<SQL
SELECT id FROM users WHERE id IN ({$user_ids_string})
SQL;
  $result = $conn->query($query);
  $verified_user_ids = array();
  while ($row = $result->fetch_assoc()) {
    $verified_user_ids[] = (int)$row['id'];
  }
  return $verified_user_ids;
}

// $ids is an array of user or cookie IDs as strings
// returns an array of validated user or cookie IDs as ints
function verify_user_or_cookie_ids($ids) {
  global $conn;

  $int_ids = array_map('intval', $ids);
  $ids_string = implode(",", $int_ids);

  $query = <<<SQL
SELECT id FROM users WHERE id IN ({$ids_string})
UNION SELECT id FROM cookies WHERE id IN ({$ids_string})
SQL;
  $result = $conn->query($query);
  $verified_ids = array();
  while ($row = $result->fetch_assoc()) {
    $verified_ids[] = (int)$row['id'];
  }
  return $verified_ids;
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
    'emailVerified' => (bool)$user_row['email_verified'],
  );
}
