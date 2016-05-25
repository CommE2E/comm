<?php

require_once('config.php');

function get_viewer_id() {
  list($id, $is_user) = get_viewer_info();
  return $id;
}

function user_logged_in() {
  list($id, $is_user) = get_viewer_info();
  return $is_user;
}

// See init_cookie return
function get_viewer_info() {
  static $viewer_info = null;
  if ($viewer_info === null) {
    $viewer_info = init_cookie();
  }
  return $viewer_info;
}

// Returns array(
//   int: either a user ID or a cookie ID (for anonymous),
//   bool: whether or not the viewer is a user
// )
function init_cookie() {
  global $conn, $cookie_lifetime;

  if (!isset($_COOKIE['user'])) {
    return array(init_anonymous_cookie(), false);
  }
  $possible_cookie_hash = $conn->real_escape_string($_COOKIE['user']);
  $result = $conn->query(
    "SELECT id, user, last_update FROM cookies ".
      "WHERE hash = UNHEX('$possible_cookie_hash') AND user IS NOT NULL"
  );
  $cookie_row = $result->fetch_assoc();
  if (!$cookie_row) {
    return array(init_anonymous_cookie(), false);
  }

  $time = round(microtime(true) * 1000); // in milliseconds
  $cookie_id = $cookie_row['id'];
  if ($cookie_row['last_update'] + $cookie_lifetime * 1000 < $time) {
    // Cookie is expired. Delete it from the database...
    $conn->query("DELETE FROM cookies WHERE id = $cookie_id");
    return array(init_anonymous_cookie(), false);
  }

  $conn->query(
    "UPDATE cookies SET last_update = $time WHERE id = $cookie_id"
  );
  return array($cookie_row['user'], true);
}

// Returns cookie ID
function init_anonymous_cookie() {
  global $conn, $base_url, $cookie_lifetime, $https;

  $time = round(microtime(true) * 1000); // in milliseconds

  // First, let's see if we already have a valid cookie
  $cookie_hash = null;
  $cookie_id = null;
  if (isset($_COOKIE['anonymous'])) {
    // We already have a cookie! Let's look up the session
    $possible_cookie_hash = $conn->real_escape_string($_COOKIE['anonymous']);
    $result = $conn->query(
      "SELECT id, last_update FROM cookies ".
        "WHERE hash = UNHEX('$possible_cookie_hash') AND user IS NULL"
    );
    $cookie_row = $result->fetch_assoc();
    if ($cookie_row) {
      if ($cookie_row['last_update'] + $cookie_lifetime * 1000 >= $time) {
        // Cookie is valid!
        $cookie_hash = $possible_cookie_hash;
        $cookie_id = $cookie_row['id'];
        $conn->query(
          "UPDATE cookies SET last_update = $time WHERE id = $cookie_id"
        );
      } else {
        // Cookie is expired. Delete it from the database...
        $old_cookie_id = $cookie_row['id'];
        $conn->query("DELETE FROM cookies WHERE id = $old_cookie_id");
        $conn->query(
          "DELETE FROM subscriptions WHERE subscriber = $old_cookie_id"
        );
      }
    }
  }

  // If we don't have a cookie set, we weren't able to find an existing session
  // Create a new session and store it in the database
  if (!$cookie_id) {
    $cookie_hash = hash('sha256', openssl_random_pseudo_bytes(32));
    $conn->query("INSERT INTO ids(table_name) VALUES('cookies')");
    $cookie_id = $conn->insert_id;
    $conn->query(
      "INSERT INTO cookies(id, hash, user, creation_time, last_update) ".
        "VALUES ($cookie_id, UNHEX('$cookie_hash'), NULL, $time, $time)"
    );
  }

  $path = parse_url($base_url, PHP_URL_PATH);
  $domain = parse_url($base_url, PHP_URL_HOST);
  $domain = preg_replace("/^www\.(.*)/", "$1", $domain);
  setcookie(
    'anonymous',
    $cookie_hash,
    intval($time / 1000) + $cookie_lifetime,
    $path,
    $domain,
    $https, // HTTPS only
    true // no JS access
  );

  return $cookie_id;
}
