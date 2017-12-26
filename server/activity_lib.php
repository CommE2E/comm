<?php

require_once('config.php');
require_once('auth.php');
require_once('permissions.php');
require_once('message_lib.php');
require_once('thread_lib.php');

// Returns the set of unfocused threads that should be set to unread on
// the client because a new message arrived since they were unfocused
function update_activity($activity_updates) {
  global $conn;

  list($viewer_id, $is_user, $cookie_id) = get_viewer_info();
  if (!$is_user) {
    return null;
  }

  $query = <<<SQL
DELETE FROM focused WHERE user = {$viewer_id} AND cookie = {$cookie_id}
SQL;
  $conn->query($query);

  $unverified_thread_ids = array();
  $focus_updates_by_thread_id = array();
  $closing = false;
  foreach ($activity_updates as $activity_update) {
    if (isset($activity_update['closing'])) {
      $closing = true;
      continue;
    }
    $thread_id = (int)$activity_update['threadID'];
    $unverified_thread_ids[$thread_id] = $thread_id;
    $focus_updates_by_thread_id[$thread_id] = $activity_update;
  }
  $verified_thread_ids = verify_thread_ids($unverified_thread_ids);

  if ($closing) {
    $query = <<<SQL
UPDATE cookies SET last_ping = 0 WHERE id = {$cookie_id}
SQL;
    $conn->query($query);
  }

  $focused_thread_ids = array();
  $unfocused_thread_ids = array();
  $unfocused_thread_latest_messages = array();
  foreach ($verified_thread_ids as $verified_thread_id) {
    $focus_update = $focus_updates_by_thread_id[$verified_thread_id];
    if ($focus_update['focus'] === "true") {
      $focused_thread_ids[] = $verified_thread_id;
    } else if ($focus_update['focus'] === "false") {
      $unfocused_thread_ids[] = $verified_thread_id;
      $unfocused_thread_latest_messages[$verified_thread_id] =
        (int)$focus_update['latestMessage'];
    }
  }

  if ($focused_thread_ids) {
    $time = round(microtime(true) * 1000); // in milliseconds
    $values_sql_strings = array();
    foreach ($focused_thread_ids as $thread_id) {
      $values_sql_strings[] = "(" . implode(
        ", ",
        array($viewer_id, $cookie_id, $thread_id, $time)
      ) . ")";
    }

    $values_sql_string = implode(", ", $values_sql_strings);
    $query = <<<SQL
INSERT INTO focused (user, cookie, thread, time) VALUES {$values_sql_string}
SQL;
    $conn->query($query);

    $thread_ids_sql_string = implode(", ", $focused_thread_ids);
    $query = <<<SQL
UPDATE memberships
SET unread = 0
WHERE role != 0
  AND thread IN ({$thread_ids_sql_string})
  AND user = {$viewer_id}
SQL;
    $conn->query($query);
  }

  // To protect against a possible race condition, we reset the thread to unread
  // if the latest message ID on the client at the time that focus was dropped
  // is no longer the latest message ID
  return possibly_reset_thread_to_unread(
    $unfocused_thread_ids,
    $unfocused_thread_latest_messages
  );
}

// Returns the set of unfocused threads that should be set to unread on
// the client because a new message arrived since they were unfocused
function possibly_reset_thread_to_unread(
  $unfocused_thread_ids,
  $unfocused_thread_latest_messages
) {
  global $conn;

  if (!$unfocused_thread_ids) {
    return array();
  }

  list($viewer_id, $is_user) = get_viewer_info();
  if (!$is_user) {
    return array();
  }

  $unfocused_pairs = array();
  foreach ($unfocused_thread_ids as $unfocused_thread_id) {
    $unfocused_pairs[] = array($viewer_id, $unfocused_thread_id);
  }
  $focused_elsewhere_pairs = check_threads_focused($unfocused_pairs);

  $focused_elsewhere = array();
  foreach ($focused_elsewhere_pairs as $focused_elsewhere_pair) {
    list($_, $focused_elsewhere_id) = $focused_elsewhere_pair;
    $focused_elsewhere[] = $focused_elsewhere_id;
  }

  $unread_candidates =
    array_values(array_diff($unfocused_thread_ids, $focused_elsewhere));
  if (!$unread_candidates) {
    return array();
  }

  $thread_ids_sql_string = implode(", ", $unread_candidates);
  $create_sub_thread = MESSAGE_TYPE_CREATE_SUB_THREAD;
  $permission_extract_string = "$." . PERMISSION_KNOW_OF . ".value";
  $query = <<<SQL
SELECT m.thread, MAX(m.id) AS latest_message
FROM messages m
LEFT JOIN threads st ON m.type = {$create_sub_thread} AND st.id = m.content
LEFT JOIN memberships stm ON m.type = {$create_sub_thread}
  AND stm.thread = m.content AND stm.user = {$viewer_id}
WHERE m.thread IN ({$thread_ids_sql_string}) AND
  (
    m.type != {$create_sub_thread} OR
    JSON_EXTRACT(stm.permissions, '{$permission_extract_string}') IS TRUE
  )
GROUP BY m.thread
SQL;
  $result = $conn->query($query);

  $to_reset = array();
  while ($row = $result->fetch_assoc()) {
    $thread_id = (int)$row['thread'];
    $server_latest_message = (int)$row['latest_message'];
    $client_latest_message = $unfocused_thread_latest_messages[$thread_id];
    if ($client_latest_message !== $server_latest_message) {
      $to_reset[] = $thread_id;
    }
  }
  if (!$to_reset) {
    return $to_reset;
  }

  $thread_ids_sql_string = implode(", ", $to_reset);
  $query = <<<SQL
UPDATE memberships
SET unread = 1
WHERE role != 0
  AND thread IN ({$thread_ids_sql_string})
  AND user = {$viewer_id}
SQL;
  $conn->query($query);

  return $to_reset;
}

// $thread_user_pairs is an array of thread, user pairs
function check_threads_focused($thread_user_pairs) {
  global $conn;

  $sql_fragments = array();
  foreach ($thread_user_pairs as $thread_user_pair) {
    list($user_id, $thread_id) = $thread_user_pair;
    $user_id = (int)$user_id;
    $thread_id = (int)$thread_id;
    $sql_fragments[] = "(user = {$user_id} AND thread = {$thread_id})";
  }
  $user_thread_clause = "(" . implode(" OR ", $sql_fragments) . ")";

  $time = earliest_time_considered_current();
  $query = <<<SQL
SELECT user, thread
FROM focused
WHERE {$user_thread_clause} AND time > {$time}
GROUP BY user, thread
SQL;
  $result = $conn->query($query);

  $focused_thread_ids = array();
  while ($row = $result->fetch_assoc()) {
    $user_id = (int)$row['user'];
    $thread_id = (int)$row['thread'];
    $focused_thread_ids[] = array($user_id, $thread_id);
  }
  return $focused_thread_ids;
}

function earliest_time_considered_current() {
  // in milliseconds
  return round(microtime(true) * 1000) - PING_INTERVAL - 1500;
}

function update_activity_time($time, $client_supports_messages) {
  global $conn;

  list($viewer_id, $is_user, $cookie_id) = get_viewer_info();
  if (!$is_user) {
    return;
  }

  $query = <<<SQL
UPDATE focused
SET time = {$time}
WHERE user = {$viewer_id} AND cookie = {$cookie_id}
SQL;
  $conn->query($query);

  // The last_ping column on the cookies table is used to determine whether a
  // message-supporting client is currently open so that we can skip sending a
  // remote notif. If the client doesn't support messages we don't touch this.
  if (!$client_supports_messages) {
    return;
  }
  $query = <<<SQL
UPDATE cookies SET last_ping = {$time} WHERE id = {$cookie_id}
SQL;
  $conn->query($query);
}
