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
  global $conn, $base_url, $cookie_lifetime, $https;

  if (!isset($_COOKIE['user'])) {
    return array(init_anonymous_cookie(), false);
  }
  $cookie_hash = $conn->real_escape_string($_COOKIE['user']);
  $result = $conn->query(
    "SELECT id, user, last_update FROM cookies ".
      "WHERE hash = UNHEX('$cookie_hash') AND user IS NOT NULL"
  );
  $cookie_row = $result->fetch_assoc();
  if (!$cookie_row) {
    setcookie('user', '', time() - 3600);
    return array(init_anonymous_cookie(), false);
  }

  $time = round(microtime(true) * 1000); // in milliseconds
  $cookie_id = $cookie_row['id'];
  if ($cookie_row['last_update'] + $cookie_lifetime * 1000 < $time) {
    // Cookie is expired. Delete it...
    setcookie('user', '', time() - 3600);
    $conn->query("DELETE FROM cookies WHERE id = $cookie_id");
    $conn->query("DELETE FROM ids WHERE id = $cookie_id");
    return array(init_anonymous_cookie(), false);
  }

  $conn->query(
    "UPDATE cookies SET last_update = $time WHERE id = $cookie_id"
  );

  $path = parse_url($base_url, PHP_URL_PATH);
  $domain = parse_url($base_url, PHP_URL_HOST);
  $domain = preg_replace("/^www\.(.*)/", "$1", $domain);
  setcookie(
    'user',
    $cookie_hash,
    intval($time / 1000) + $cookie_lifetime,
    $path,
    $domain,
    $https, // HTTPS only
    true // no JS access
  );
  return array($cookie_row['user'], true);
}

// Returns cookie ID
function init_anonymous_cookie() {
  global $conn, $base_url, $cookie_lifetime, $https;

  list($cookie_id, $cookie_hash) = get_anonymous_cookie();
  $time = round(microtime(true) * 1000); // in milliseconds

  if ($cookie_id) {
    $conn->query(
      "UPDATE cookies SET last_update = $time WHERE id = $cookie_id"
    );
  } else {
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

// Returns array(int: cookie_id, string: cookie_hash)
// If no anonymous cookie, returns (null, null)
function get_anonymous_cookie() {
  global $conn, $cookie_lifetime;

  // First, let's see if we already have a valid cookie
  if (!isset($_COOKIE['anonymous'])) {
    return array(null, null);
  }

  // We already have a cookie! Let's look up the session
  $cookie_hash = $conn->real_escape_string($_COOKIE['anonymous']);
  $result = $conn->query(
    "SELECT id, last_update FROM cookies ".
      "WHERE hash = UNHEX('$cookie_hash') AND user IS NULL"
  );

  $cookie_row = $result->fetch_assoc();
  if (!$cookie_row) {
    return array(null, null);
  }

  // Is the cookie expired?
  $time = round(microtime(true) * 1000); // in milliseconds
  if ($cookie_row['last_update'] + $cookie_lifetime * 1000 < $time) {
    $old_cookie_id = $cookie_row['id'];
    $conn->query("DELETE FROM cookies WHERE id = $old_cookie_id");
    $conn->query("DELETE FROM ids WHERE id = $old_cookie_id");
    $conn->query(
      "DELETE FROM subscriptions WHERE subscriber = $old_cookie_id"
    );
    return array(null, null);
  }

  return array($cookie_row['id'], $cookie_hash);
}
