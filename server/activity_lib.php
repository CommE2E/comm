<?php

require_once('config.php');
require_once('auth.php');

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
