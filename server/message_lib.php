<?php

require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');

// this function will fetch the newest $number_per_thread messages from each
// thread ID included as a KEY in the $input array. the values are the IDs of
// the newest message NOT to fetch from each thread, ie. every result message
// should be newer than the specified message. in other words, we use the
// message ID as the "cursor" for paging. if the value is falsey, we will simply
// fetch the very newest $number_per_thread from that thread. if $input itself
// is null, we will fetch from every thread that the user is subscribed to
function get_message_infos($input, $number_per_thread) {
  global $conn;

  $viewer_id = get_viewer_id();
  $visibility_closed = VISIBILITY_CLOSED;
  $role_successful_auth = ROLE_SUCCESSFUL_AUTH;

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

  $int_number_per_thread = (int)$number_per_thread;
  $query = <<<SQL
SET @num := 0, @thread := '';
SELECT x.id, x.thread, x.user, u.username, x.text, x.time
FROM (
  SELECT m.id, m.user, m.text, m.time,
    @num := if(@thread = m.thread, @num + 1, 1) AS number,
    @thread := m.thread AS thread
  FROM messages m
  LEFT JOIN threads t ON t.id = m.thread
  LEFT JOIN roles r ON r.thread = m.thread AND r.user = {$viewer_id}
  WHERE (t.visibility_rules < {$visibility_closed} OR
    (r.thread IS NOT NULL AND r.role >= {$role_successful_auth})) AND
    {$additional_condition}
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
  while ($row = $row_result->fetch_assoc()) {
    $messages[] = $row;
  }
  return $messages;
}
