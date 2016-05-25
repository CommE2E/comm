<?php

require_once('config.php');
require_once('auth.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  exit(json_encode(array(
    'error' => 'tls_failure',
  )));
}

if (!isset($_POST['username']) || !isset($_POST['password'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$username = $conn->real_escape_string($_POST['username']);
$password = $_POST['password'];
if (isset($_COOKIE['user'])) {
  exit(json_encode(array(
    'error' => 'already_logged_in',
  )));
}

$result = $conn->query(
  "SELECT id, LOWER(HEX(salt)) AS salt, LOWER(HEX(hash)) AS hash ".
    "FROM users WHERE username=\"$username\""
);
$user_row = $result->fetch_assoc();
if (!$user_row) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$hash = hash('sha512', $password.$user_row['salt']);
if ($user_row['hash'] !== $hash) {
  exit(json_encode(array(
    'error' => 'invalid_credentials',
  )));
}

// Now that credentials are validated, we need to create a cookie
$cookie_hash = hash('sha256', openssl_random_pseudo_bytes(32));
$conn->query("INSERT INTO ids(table_name) VALUES('cookies')");
$cookie_id = $conn->insert_id;
$time = round(microtime(true) * 1000); // in milliseconds
$user_id = $user_row['id'];
$conn->query(
  "INSERT INTO cookies(id, hash, user, creation_time, last_update) ".
    "VALUES ($cookie_id, UNHEX('$cookie_hash'), $user_id, $time, $time)"
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

// We can kill the anonymous cookie now
// We want to do this regardless of get_anonymous_cookie since that function can
// return null when there is a cookie on the client
setcookie('anonymous', '', time() - 3600);
list($anonymous_cookie_id, $_) = get_anonymous_cookie();
if (!$anonymous_cookie_id) {
  exit(json_encode(array(
    'success' => true,
  )));
}

// Now we will move the anonymous cookie's memberships to the logged in user
// MySQL can't handle constraint violations on UPDATE, so need to pull all the
// membership rows to PHP, delete them, and then recreate them :(
$result = $conn->query(
  "SELECT squad, last_view FROM subscriptions ".
    "WHERE subscriber = $anonymous_cookie_id"
);
$new_rows = array();
while ($row = $result->fetch_assoc()) {
  $new_rows[] = "(".$row['squad'].", ".$user_id.", ".$row['last_view'].")";
}
if ($new_rows) {
  $conn->query(
    "INSERT INTO subscriptions(squad, subscriber, last_view) VALUES ".
      "VALUES ".implode(', ', $new_rows)." ".
      "ON DUPLICATE KEY ".
      "UPDATE last_view = GREATEST(VALUES(last_view), last_view)"
  );
  $conn->query(
    "DELETE FROM subscriptions WHERE subscriber = $anonymous_cookie_id"
  );
}

$conn->query("DELETE FROM cookies WHERE id = $anonymous_cookie_id");
$conn->query("DELETE FROM ids WHERE id = $anonymous_cookie_id");

exit(json_encode(array(
  'success' => true,
)));
