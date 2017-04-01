<?php

require_once('config.php');
require_once('calendar_lib.php');

define("ROLE_VIEWED", 0);
define("ROLE_SUCCESSFUL_AUTH", 5);
define("ROLE_CREATOR", 50);

// Returns either a user ID or a cookie ID (for anonymous)
function get_viewer_id() {
  list($id, $is_user) = get_viewer_info();
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
// sure to update some client data (CalendarInfo, UserInfo, etc.)
function cookie_has_changed() {
  global $original_viewer_info,
    $current_viewer_info,
    $inbound_cookie_invalidated;
  if ($inbound_cookie_invalidated) {
    return true;
  }
  if ($original_viewer_info === null && $current_viewer_info === null) {
    return false;
  }
  return $original_viewer_info[0] !== $current_viewer_info[0];
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

  if (!isset($_COOKIE['user'])) {
    init_anonymous_cookie(true);
    return;
  }
  list($cookie_id, $cookie_password) = explode(':', $_COOKIE['user']);
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
  $current_viewer_info = array((int)$cookie_row['user'], true);
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

  $current_viewer_info = array((int)$cookie_id, false);
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

  $current_viewer_info = array($user_id, true);
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

  // Now we will move the anonymous cookie's memberships to the logged in user
  // MySQL can't handle constraint violations on UPDATE, so need to pull all the
  // membership rows to PHP, delete them, and then recreate them :(
  $result = $conn->query(
    "SELECT calendar, creation_time, last_view, role, subscribed FROM roles ".
      "WHERE user = $anonymous_cookie_id"
  );
  $new_rows = array();
  while ($row = $result->fetch_assoc()) {
    $new_rows[] = "(".implode(", ", array(
      $row['calendar'],
      $user_id,
      $row['creation_time'],
      $row['last_view'],
      $row['role'],
      $row['subscribed']
    )).")";
  }
  if ($new_rows) {
    $conn->query(
      "INSERT INTO roles(calendar, user, ".
        "creation_time, last_view, role, subscribed) ".
        "VALUES ".implode(', ', $new_rows)." ".
        "ON DUPLICATE KEY UPDATE ".
        "creation_time = LEAST(VALUES(creation_time), creation_time), ".
        "last_view = GREATEST(VALUES(last_view), last_view), ".
        "role = GREATEST(VALUES(role), role), ".
        "subscribed = GREATEST(VALUES(subscribed), subscribed)"
    );
    $conn->query(
      "DELETE FROM roles WHERE user = $anonymous_cookie_id"
    );
  }
  $conn->query(
    "DELETE c, i FROM cookies c LEFT JOIN ids i ON i.id = c.id ".
      "WHERE c.id = $anonymous_cookie_id"
  );
}

// Returns array(int: cookie_id, string: cookie_hash)
// If no anonymous cookie, returns (null, null)
function get_anonymous_cookie($initial_run) {
  global $conn, $cookie_lifetime, $inbound_cookie_invalidated;

  // First, let's see if we already have a valid cookie
  if (!isset($_COOKIE['anonymous'])) {
    return array(null, null);
  }

  // We already have a cookie! Let's look up the session
  list($cookie_id, $cookie_password) = explode(':', $_COOKIE['anonymous']);
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
    $conn->query(
      "DELETE c, i FROM cookies c LEFT JOIN ids i ON i.id = c.id ".
        "WHERE c.id = $cookie_id"
    );
    $conn->query("DELETE FROM roles WHERE user = $cookie_id");
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

// null if calendar does not exist
function viewer_can_see_calendar($calendar) {
  global $conn;

  $viewer_id = get_viewer_id();
  $result = $conn->query(
    "SELECT c.visibility_rules >= ".VISIBILITY_CLOSED." AND ".
      "(r.calendar IS NULL OR r.role < ".ROLE_SUCCESSFUL_AUTH.") ".
      "AS requires_auth FROM calendars c ".
      "LEFT JOIN roles r ON r.calendar = c.id AND r.user = {$viewer_id} ".
      "WHERE c.id = $calendar"
  );
  $calendar_row = $result->fetch_assoc();
  if (!$calendar_row) {
    return null;
  }
  return !$calendar_row['requires_auth'];
}

// null if day does not exist
function viewer_can_see_day($day) {
  global $conn;

  $viewer_id = get_viewer_id();
  $result = $conn->query(
    "SELECT c.visibility_rules >= ".VISIBILITY_CLOSED." AND ".
      "(r.calendar IS NULL OR r.role < ".ROLE_SUCCESSFUL_AUTH.") ".
      "AS requires_auth FROM days d ".
      "LEFT JOIN calendars c ON c.id = d.calendar ".
      "LEFT JOIN roles r ON r.calendar = d.calendar AND r.user = {$viewer_id} ".
      "WHERE d.id = $day"
  );
  $day_row = $result->fetch_assoc();
  if (!$day_row) {
    return null;
  }
  return !$day_row['requires_auth'];
}

// null if entry does not exist
function viewer_can_see_entry($entry) {
  global $conn;

  $viewer_id = get_viewer_id();
  $result = $conn->query(
    "SELECT c.visibility_rules >= ".VISIBILITY_CLOSED." AND ".
      "(r.calendar IS NULL OR r.role < ".ROLE_SUCCESSFUL_AUTH.") ".
      "AS requires_auth FROM entries e ".
      "LEFT JOIN days d ON d.id = e.day ".
      "LEFT JOIN calendars c ON c.id = d.calendar ".
      "LEFT JOIN roles r ON r.calendar = d.calendar AND r.user = {$viewer_id} ".
      "WHERE e.id = $entry"
  );
  $entry_row = $result->fetch_assoc();
  if (!$entry_row) {
    return null;
  }
  return !$entry_row['requires_auth'];
}

function edit_rules_helper($mysql_row) {
  if (!$mysql_row) {
    return null;
  }
  if ($mysql_row['requires_auth']) {
    return false;
  }
  if (!user_logged_in() && intval($mysql_row['edit_rules']) === 1) {
    return false;
  }
  return true;
}

// null if calendar does not exist
// false if the viewer can't see into the calendar, or can't edit it
// true if the viewer can see into and edit the calendar
function viewer_can_edit_calendar($calendar) {
  global $conn;

  $viewer_id = get_viewer_id();
  $result = $conn->query(
    "SELECT c.visibility_rules >= ".VISIBILITY_CLOSED." AND ".
      "(r.calendar IS NULL OR r.role < ".ROLE_SUCCESSFUL_AUTH.") ".
      "AS requires_auth, c.edit_rules FROM calendars c ".
      "LEFT JOIN roles r ON r.calendar = c.id AND r.user = {$viewer_id} ".
      "WHERE c.id = $calendar"
  );
  return edit_rules_helper($result->fetch_assoc());
}

// null if entry does not exist
// false if the viewer can't see into the calendar, or can't edit it
// true if the viewer can see into and edit the calendar
// note that this function does not check if the entry is deleted
function viewer_can_edit_entry($entry) {
  global $conn;

  $viewer_id = get_viewer_id();
  $result = $conn->query(
    "SELECT c.visibility_rules >= ".VISIBILITY_CLOSED." AND ".
      "(r.calendar IS NULL OR r.role < ".ROLE_SUCCESSFUL_AUTH.") ".
      "AS requires_auth, c.edit_rules FROM entries e ".
      "LEFT JOIN days d ON d.id = e.day ".
      "LEFT JOIN calendars c ON c.id = d.calendar ".
      "LEFT JOIN roles r ON r.calendar = d.calendar AND r.user = {$viewer_id} ".
      "WHERE e.id = $entry"
  );
  return edit_rules_helper($result->fetch_assoc());
}
