<?php

require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');
require_once('permissions.php');

// keep value in sync with numberPerThread in message_reducer.js
define("DEFAULT_NUMBER_PER_THREAD", 20);

// Messages aren't just messages, but any updates to a thread
define("MESSAGE_TYPE_TEXT", 0);
define("MESSAGE_TYPE_CREATE_THREAD", 1);
define("MESSAGE_TYPE_ADD_MEMBERS", 2);
define("MESSAGE_TYPE_CREATE_SUB_THREAD", 3);
define("MESSAGE_TYPE_CHANGE_SETTINGS", 4);
define("MESSAGE_TYPE_REMOVE_MEMBERS", 5);
define("MESSAGE_TYPE_CHANGE_ROLE", 6);

// Every time the client asks us for MessageInfos, we need to let them know if
// the result for a given thread affects startReached. If it's just new messages
// (via get_messages_since) we leave it as TRUNCATION_UNCHANGED, unless there
// are too many new messages to return them all, in which case we return
// TRUNCATION_TRUNCATED to tell the client to throw away its existing
// messageStore.threads and set startReached to false. As for clean-slate
// message-fetching (get_message_infos), we return either TRUNCATION_TRUNCATED
// or TRUNCATION_EXHAUSTIVE, depending on if included all of the messages in the
// thread.
define("TRUNCATION_TRUNCATED", "truncated");
define("TRUNCATION_UNCHANGED", "unchanged");
define("TRUNCATION_EXHAUSTIVE", "exhaustive");

// This function will fetch the newest $number_per_thread messages from each
// thread ID included as a KEY in the $input array. the values are the IDs of
// the newest message NOT to fetch from each thread, ie. every result message
// should be newer than the specified message. in other words, we use the
// message ID as the "cursor" for paging. if the value is falsey, we will simply
// fetch the very newest $number_per_thread from that thread. if $input itself
// is null, we will fetch from every thread that the user is subscribed to. This
// function returns:
// - An array of MessageInfos
// - An array that points from threadID to truncation status (see definition of
//   TRUNCATION_ constants)
// - An array of user IDs pointing to UserInfo objects for all referenced users
function get_message_infos($input, $number_per_thread) {
  global $conn;

  if (is_array($input)) {
    $conditions = array();
    foreach ($input as $thread => $cursor) {
      $int_thread = (int)$thread;
      if ($cursor) {
        $int_cursor = (int)$cursor;
        $conditions[] = "(m.thread = $int_thread AND m.id < $int_cursor)";
      } else {
        $conditions[] = "m.thread = $int_thread";
      }
    }
    $additional_condition = "(".implode(" OR ", $conditions).")";
  } else {
    $additional_condition = "r.subscribed = 1";
  }

  $viewer_id = get_viewer_id();
  $visibility_open = VISIBILITY_OPEN;
  $visibility_nested_open = VISIBILITY_NESTED_OPEN;
  $int_number_per_thread = (int)$number_per_thread;
  $query = <<<SQL
SET @num := 0, @thread := '';
SELECT x.id, x.thread AS threadID, x.content, x.time, x.type,
  u.username AS creator, x.user AS creatorID
FROM (
  SELECT m.id, m.user, m.content, m.time, m.type,
    @num := if(@thread = m.thread, @num + 1, 1) AS number,
    @thread := m.thread AS thread
  FROM messages m
  LEFT JOIN threads t ON t.id = m.thread
  LEFT JOIN roles r ON r.thread = m.thread AND r.user = {$viewer_id}
  WHERE (r.visible = 1 OR t.visibility_rules = {$visibility_open})
    AND {$additional_condition}
  ORDER BY m.thread, m.time DESC
) x
LEFT JOIN users u ON u.id = x.user
WHERE x.number <= {$int_number_per_thread};
SQL;
  $query_result = $conn->multi_query($query);
  if (!$query_result) {
    return null;
  }
  $conn->next_result();
  $row_result = $conn->store_result();

  $messages = array();
  $users = array();
  $thread_to_message_count = array();
  while ($row = $row_result->fetch_assoc()) {
    $users[$row['creatorID']] = array(
      'id' => $row['creatorID'],
      'username' => $row['creator'],
    );
    $message = message_from_row($row);
    if ($message) {
      $messages[] = $message;
    }
    if (!isset($thread_to_message_count[$row['threadID']])) {
      $thread_to_message_count[$row['threadID']] = 1;
    } else {
      $thread_to_message_count[$row['threadID']]++;
    }
  }

  $truncation_status = array();
  foreach ($thread_to_message_count as $thread_id => $message_count) {
    $truncation_status[$thread_id] = $message_count < $int_number_per_thread
      ? TRUNCATION_EXHAUSTIVE
      : TRUNCATION_TRUNCATED;
  }
  if (is_array($input)) {
    foreach ($input as $thread => $cursor) {
      if (!isset($truncation_status[$thread])) {
        $truncation_status[$thread] = TRUNCATION_EXHAUSTIVE;
      }
    }
  }

  $all_users = get_all_users($messages, $users);

  return array($messages, $truncation_status, $all_users);
}

// In contrast with the above function, which is used at the start of a session,
// this one is used to keep a session updated. You give it a timestamp, and it
// fetches all of the messages with a newer timestamp. If for a given thread
// more than $max_number_per_thread messages have been sent since $current_as_of
// then the most recent $current_as_of will be returned. This function returns:
// - An array of MessageInfos
// - An array that points from threadID to truncation status (see definition of
//   TRUNCATION_ constants)
// - An array of user IDs pointing to UserInfo objects for all referenced users
function get_messages_since($current_as_of, $max_number_per_thread) {
  global $conn;

  $viewer_id = get_viewer_id();
  $visibility_open = VISIBILITY_OPEN;
  $visibility_nested_open = VISIBILITY_NESTED_OPEN;
  $query = <<<SQL
SELECT m.id, m.thread AS threadID, m.content, m.time, m.type,
  u.username AS creator, m.user AS creatorID
FROM messages m
LEFT JOIN threads t ON t.id = m.thread
LEFT JOIN roles r ON r.thread = m.thread AND r.user = {$viewer_id}
LEFT JOIN users u ON u.id = m.user
WHERE (r.visible = 1 OR t.visibility_rules = {$visibility_open})
  AND m.time > {$current_as_of}
ORDER BY m.thread, m.time DESC
SQL;
  $result = $conn->query($query);

  $current_thread = null;
  $num_for_thread = 0;
  $messages = array();
  $users = array();
  $truncation_status = array();
  while ($row = $result->fetch_assoc()) {
    $thread = $row["threadID"];
    if ($thread !== $current_thread) {
      $current_thread = $thread;
      $num_for_thread = 1;
      $truncation_status[$thread] = TRUNCATION_UNCHANGED;
    } else {
      $num_for_thread++;
    }
    if ($num_for_thread <= $max_number_per_thread) {
      if ((int)$row['type'] === 1) {
        // If a CREATE_THREAD message is here, then we have all messages
        $truncation_status[$thread] = TRUNCATION_EXHAUSTIVE;
      }
      $users[$row['creatorID']] = array(
        'id' => $row['creatorID'],
        'username' => $row['creator'],
      );
      $message = message_from_row($row);
      if ($message) {
        $messages[] = $message;
      }
    } else if ($num_for_thread === $max_number_per_thread + 1) {
      $truncation_status[$thread] = TRUNCATION_TRUNCATED;
    }
  }

  $all_users = get_all_users($messages, $users);

  return array($messages, $truncation_status, $all_users);
}

function message_from_row($row) {
  $type = (int)$row['type'];
  $message = array(
    'id' => $row['id'],
    'threadID' => $row['threadID'],
    'time' => (int)$row['time'],
    'type' => $type,
    'creatorID' => $row['creatorID'],
  );
  if ($type === MESSAGE_TYPE_TEXT) {
    $message['text'] = $row['content'];
  } else if ($type === MESSAGE_TYPE_CREATE_THREAD) {
    $message['initialThreadState'] = json_decode($row['content'], true);
  } else if ($type === MESSAGE_TYPE_ADD_MEMBERS) {
    $message['addedUserIDs'] = json_decode($row['content'], true);
  } else if ($type === MESSAGE_TYPE_CREATE_SUB_THREAD) {
    $child_thread_id = $row['content'];
    if (!check_thread_permission((int)$child_thread_id, PERMISSION_KNOW_OF)) {
      return null;
    }
    $message['childThreadID'] = $child_thread_id;
  } else if ($type === MESSAGE_TYPE_CHANGE_SETTINGS) {
    $change = json_decode($row['content'], true);
    $message['field'] = array_keys($change)[0];
    $message['value'] = $change[$message['field']];
  } else if ($type === MESSAGE_TYPE_REMOVE_MEMBERS) {
    $message['removedUserIDs'] = json_decode($row['content'], true);
  } else if ($type === MESSAGE_TYPE_CHANGE_ROLE) {
    $content = json_decode($row['content'], true);
    $message['userIDs'] = $content['userIDs'];
    $message['newRole'] = $content['newRole'];
  }
  return $message;
}

function get_all_users($messages, $users) {
  global $conn;

  $all_added_user_ids = array();
  foreach ($messages as $message) {
    $new_users = array();
    if ($message['type'] === MESSAGE_TYPE_ADD_MEMBERS) {
      $new_users = $message['addedUserIDs'];
    } else if ($message['type'] === MESSAGE_TYPE_CREATE_THREAD) {
      $new_users = $message['initialThreadState']['memberIDs'];
    }
    foreach ($new_users as $user_id) {
      if (!isset($users[$user_id])) {
        $all_added_user_ids[] = $user_id;
      }
    }
  }
  if (!$all_added_user_ids) {
    return $users;
  }

  $where_in = implode(',', $all_added_user_ids);
  $query = <<<SQL
SELECT id, username FROM users WHERE id IN ({$where_in})
SQL;
  $result = $conn->query($query);

  while ($row = $result->fetch_assoc()) {
    $users[$row['id']] = array(
      'id' => $row['id'],
      'username' => $row['username'],
    );
  }
  return $users;
}

// returns message infos with IDs on success, and null on failure
// only fails if passed a message type it doesn't recognize
function create_message_infos($new_message_infos) {
  global $conn;

  if (!$new_message_infos) {
    return array();
  }

  $content_by_index = array();
  foreach ($new_message_infos as $index => $new_message_info) {
    if ($new_message_info['type'] === MESSAGE_TYPE_CREATE_THREAD) {
      $content_by_index[$index] = $conn->real_escape_string(
        json_encode($new_message_info['initialThreadState'])
      );
    } else if ($new_message_info['type'] === MESSAGE_TYPE_CREATE_SUB_THREAD) {
      $content_by_index[$index] = $new_message_info['childThreadID'];
    } else if ($new_message_info['type'] === MESSAGE_TYPE_TEXT) {
      $content_by_index[$index] = $conn->real_escape_string(
        $new_message_info['text']
      );
    } else if ($new_message_info['type'] === MESSAGE_TYPE_ADD_MEMBERS) {
      $content_by_index[$index] = $conn->real_escape_string(
        json_encode($new_message_info['addedUserIDs'])
      );
    } else if ($new_message_info['type'] === MESSAGE_TYPE_CHANGE_SETTINGS) {
      $content_by_index[$index] = $conn->real_escape_string(json_encode(array(
        $new_message_info['field'] => $new_message_info['value'],
      )));
    } else if ($new_message_info['type'] === MESSAGE_TYPE_REMOVE_MEMBERS) {
      $content_by_index[$index] = $conn->real_escape_string(
        json_encode($new_message_info['removedUserIDs'])
      );
    } else if ($new_message_info['type'] === MESSAGE_TYPE_CHANGE_ROLE) {
      $content = array(
        "userIDs" => $new_message_info['userIDs'],
        "newRole" => $new_message_info['newRole'],
      );
      $content_by_index[$index] = $conn->real_escape_string(
        json_encode($content)
      );
    } else {
      return null;
    }
  }

  $values = array();
  $return = array();
  foreach ($new_message_infos as $index => $new_message_info) {
    $conn->query("INSERT INTO ids(table_name) VALUES('messages')");
    $new_message_info['id'] = (string)$conn->insert_id;
    $values[] = <<<SQL
({$new_message_info['id']}, {$new_message_info['threadID']},
  {$new_message_info['creatorID']}, {$new_message_info['type']},
  '{$content_by_index[$index]}', {$new_message_info['time']})
SQL;
    $return[$index] = $new_message_info;
  }

  $all_values = implode(", ", $values);
  $message_insert_query = <<<SQL
INSERT INTO messages(id, thread, user, type, content, time)
VALUES {$all_values}
SQL;
  $conn->query($message_insert_query);

  return $return;
}
