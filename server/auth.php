<?php

require_once('config.php');
require_once('thread_lib.php');
require_once('permissions.php');

define("ROLE_VIEWED", 0);
define("ROLE_SUCCESSFUL_AUTH", 5);
define("ROLE_CREATOR", 50);

// Returns either a user ID or a cookie ID (for anonymous)
function get_viewer_id() {
  list($id) = get_viewer_info();
  return $id;
}

// True if viewer is a registered user; false otherwise
function user_logged_in() {
  list($id, $is_user) = get_viewer_info();
  return $is_user;
}

$original_viewer_info = null;
$current_viewer_info = null;
$inbound_cookie_invalidated = false;
$cookie_sent_from_client = true;

// See init_cookie return
function get_viewer_info() {
  global $original_viewer_info, $current_viewer_info;
  if ($current_viewer_info === null) {
    init_cookie();
    $original_viewer_info = $current_viewer_info;
  }
  return $current_viewer_info;
}

// If the main cookie the client sent was invalidated for whatever reason.
// If the client sends us both a user and an anonymous cookie for some weird
// reason, we won't bother checking the anonymous cookie unless the user one
// is invalid. Also, we won't consider the cookie invalidated if we're gonna
// replace it anyways.
function cookie_invalidated() {
  global $inbound_cookie_invalidated;
  return $inbound_cookie_invalidated;
}

// When the cookie the client sent doesn't match up with the cookie we end up
// using for them, along with sending the client the new cookie, we want to make
// sure to update some client data (ThreadInfo, UserInfo, etc.)
function cookie_has_changed() {
  global $original_viewer_info,
    $current_viewer_info,
    $inbound_cookie_invalidated,
    $cookie_sent_from_client;
  if ($inbound_cookie_invalidated || !$cookie_sent_from_client) {
    return true;
  }
  if ($original_viewer_info === null && $current_viewer_info === null) {
    return false;
  }
  return $original_viewer_info[3] !== $current_viewer_info[3];
}

function get_input_user_cookie() {
  if (!isset($_POST['cookie'])) {
    return isset($_COOKIE['user']) ? $_COOKIE['user'] : null;
  }
  $matches = array();
  $num_matches = preg_match("/user=(.+)/", $_POST['cookie'], $matches);
  if (!$num_matches) {
    return null;
  }
  return $matches[1];
}

function get_input_anonymous_cookie() {
  if (!isset($_POST['cookie'])) {
    return isset($_COOKIE['anonymous']) ? $_COOKIE['anonymous'] : null;
  }
  $matches = array();
  $num_matches = preg_match("/anonymous=(.+)/", $_POST['cookie'], $matches);
  if (!$num_matches) {
    return null;
  }
  return $matches[1];
}

// Returns array(
//   int: either a user ID or a cookie ID (for anonymous),
//   bool: whether or not the viewer is a user
// )
function init_cookie() {
  global $conn,
    $cookie_lifetime,
    $current_viewer_info,
    $inbound_cookie_invalidated;

  $user_cookie = get_input_user_cookie();
  if ($user_cookie === null) {
    init_anonymous_cookie(true);
    return;
  }
  list($cookie_id, $cookie_password) = explode(':', $user_cookie);
  $cookie_id = intval($cookie_id);
  $result = $conn->query(
    "SELECT hash, user, last_update FROM cookies ".
      "WHERE id = $cookie_id AND user IS NOT NULL"
  );
  $cookie_row = $result->fetch_assoc();
  if (!$cookie_row || !password_verify($cookie_password, $cookie_row['hash'])) {
    delete_cookie('user');
    init_anonymous_cookie(true);
    $inbound_cookie_invalidated = true;
    return;
  }

  $time = round(microtime(true) * 1000); // in milliseconds
  if ($cookie_row['last_update'] + $cookie_lifetime * 1000 < $time) {
    // Cookie is expired. Delete it...
    delete_cookie('user');
    $conn->query(
      "DELETE c, i FROM cookies c LEFT JOIN ids i ON i.id = c.id ".
        "WHERE c.id = $cookie_id"
    );
    init_anonymous_cookie(true);
    $inbound_cookie_invalidated = true;
    return;
  }

  $conn->query(
    "UPDATE cookies SET last_update = $time WHERE id = $cookie_id"
  );

  add_cookie('user', "$cookie_id:$cookie_password", $time);
  $current_viewer_info = array(
    (int)$cookie_row['user'],
    true,
    $cookie_id,
    "user=$cookie_id:$cookie_password",
  );
}

// Returns cookie ID
function init_anonymous_cookie($initial_run = false) {
  global $conn, $current_viewer_info, $inbound_cookie_invalidated;

  list($cookie_id, $cookie_password) = get_anonymous_cookie($initial_run);
  $time = round(microtime(true) * 1000); // in milliseconds

  if ($cookie_id) {
    $conn->query(
      "UPDATE cookies SET last_update = $time WHERE id = $cookie_id"
    );
  } else {
    $cookie_password = bin2hex(openssl_random_pseudo_bytes(32));
    $cookie_hash = password_hash($cookie_password, PASSWORD_BCRYPT);
    $conn->query("INSERT INTO ids(table_name) VALUES('cookies')");
    $cookie_id = $conn->insert_id;
    $conn->query(
      "INSERT INTO cookies(id, hash, user, creation_time, last_update) ".
        "VALUES ($cookie_id, '$cookie_hash', NULL, $time, $time)"
    );
  }

  add_cookie('anonymous', "$cookie_id:$cookie_password", $time);

  $current_viewer_info = array(
    (int)$cookie_id,
    false,
    $cookie_id,
    "anonymous=$cookie_id:$cookie_password",
  );
  if (!$initial_run) {
    // We no longer care about the inbound cookie and whether it was invalidated
    $inbound_cookie_invalidated = false;
  }
}

// Creates a new user cookie and merges with any existing anonymous cookie
function create_user_cookie($user_id) {
  global $conn, $current_viewer_info, $inbound_cookie_invalidated;

  $cookie_password = bin2hex(openssl_random_pseudo_bytes(32));
  $cookie_hash = password_hash($cookie_password, PASSWORD_BCRYPT);
  $conn->query("INSERT INTO ids(table_name) VALUES('cookies')");
  $cookie_id = $conn->insert_id;
  $time = round(microtime(true) * 1000); // in milliseconds
  $conn->query(
    "INSERT INTO cookies(id, hash, user, creation_time, last_update) ".
      "VALUES ($cookie_id, '$cookie_hash', $user_id, $time, $time)"
  );
  add_cookie('user', "$cookie_id:$cookie_password", $time);

  $current_viewer_info = array(
    $user_id,
    true,
    $cookie_id,
    "user=$cookie_id:$cookie_password",
  );

  // We no longer care about the inbound cookie and whether it was invalidated
  $inbound_cookie_invalidated = false;

  // We can kill the anonymous cookie now
  // We want to do this regardless of get_anonymous_cookie since that function can
  // return null when there is a cookie on the client
  delete_cookie('anonymous');
  list($anonymous_cookie_id, $_) = get_anonymous_cookie(false);
  if (!$anonymous_cookie_id) {
    return;
  }

  delete_cookie_from_server($anonymous_cookie_id);
}

function delete_cookie_from_server($cookie_id) {
  global $conn;

  $query = <<<SQL
DELETE c, i, m
FROM cookies c
LEFT JOIN ids i ON i.id = c.id
LEFT JOIN memberships m ON m.user = c.id
WHERE c.id = {$cookie_id}
SQL;
  $conn->query($query);
}

// Returns array(int: cookie_id, string: cookie_hash)
// If no anonymous cookie, returns (null, null)
function get_anonymous_cookie($initial_run) {
  global $conn,
    $cookie_lifetime,
    $inbound_cookie_invalidated,
    $cookie_sent_from_client;

  // First, let's see if we already have a valid cookie
  $anonymous_cookie = get_input_anonymous_cookie();
  if ($anonymous_cookie === null) {
    // If we get here on the first run, that means there was no cookie sent by
    // the client at all
    if ($initial_run) {
      // Note that this function (get_anonymous_cookie) can get called with
      // $initial_run === true in situations where a user cookie was specified,
      // but it was invalid. In those situations setting
      // $cookie_sent_from_client to false isn't quite correct, but it doesn't
      // matter since in all those situations $inbound_cookie_invalidated gets
      // set to true anyways, and $cookie_sent_from_client is thus irrelevant.
      $cookie_sent_from_client = false;
    }
    return array(null, null);
  }

  // We already have a cookie! Let's look up the session
  list($cookie_id, $cookie_password) = explode(':', $anonymous_cookie);
  $cookie_id = intval($cookie_id);
  $result = $conn->query(
    "SELECT last_update, hash FROM cookies ".
      "WHERE id = $cookie_id AND user IS NULL"
  );
  $cookie_row = $result->fetch_assoc();
  if (!$cookie_row || !password_verify($cookie_password, $cookie_row['hash'])) {
    if ($initial_run) {
      $inbound_cookie_invalidated = true;
    }
    return array(null, null);
  }

  // Is the cookie expired?
  $time = round(microtime(true) * 1000); // in milliseconds
  if ($cookie_row['last_update'] + $cookie_lifetime * 1000 < $time) {
    delete_cookie_from_server($cookie_id);
    if ($initial_run) {
      $inbound_cookie_invalidated = true;
    }
    return array(null, null);
  }

  return array($cookie_id, $cookie_password);
}

// $current_time in milliseconds
function add_cookie($name, $value, $current_time) {
  global $cookie_lifetime;
  set_cookie($name, $value, intval($current_time / 1000) + $cookie_lifetime);
}

function delete_cookie($name) {
  set_cookie($name, '', time() - 3600);
}

// $expiration_time in seconds
function set_cookie($name, $value, $expiration_time) {
  global $base_url, $base_domain, $https;

  if (DEV && $_SERVER['HTTP_HOST'] == '10.0.2.2') {
    // Since Android for local development runs on an emulator (as opposed to a
    // simulator), it can't access the local server via localhost. Instead,
    // there's a magic IP (10.0.2.2) that forwards to the local server. We need
    // to set the hostname on the cookie correspondingly so Android keeps it.
    $domain = "10.0.2.2";
  } else {
    $domain = parse_url($base_domain, PHP_URL_HOST);
    $domain = preg_replace("/^www\.(.*)/", "$1", $domain);
  }

  setcookie(
    $name,
    $value,
    $expiration_time,
    $base_url,
    $domain,
    $https, // HTTPS only
    true // no JS access
  );
}
