<?php

require_once('config.php');

// Returns array($cookie_id, $cookie_hash)
function init_anonymous_cookie() {
  global $conn, $base_url, $cookie_lifetime;

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
      if ($cookie_row['last_update'] + $cookie_lifetime * 1000 > $time) {
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
    'anonymous', // name
    $cookie_hash,
    intval($time / 1000) + $cookie_lifetime, // expiration
    $path,
    $domain,
    false, // secure TODO
    true // httponly
  );

  return array($cookie_id, $cookie_hash);
}
