<?php

require_once('config.php');

// the thing being verified
define('VERIFY_FIELD_EMAIL', 0);
define('VERIFY_FIELD_RESET_PASSWORD', 1);

function verify_email($user, $username, $email) {
  global $base_url, $conn;

  $verify_hash = generate_hash($user, VERIFY_FIELD_EMAIL);
  $link = $base_url . "?verify=$verify_hash";
  $contents = <<<EMAIL
<html>
  <body style="font-family: sans-serif;">
    <h3>Welcome to SquadCal, $username!</h3>
    <p>
      Please complete your registration and verify your email by
      clicking this link: <a href="$link">$link</a>
    </p>
  </body>
</html>
EMAIL;
  mail(
    $email,
    'Verify email for SquadCal',
    $contents,
    "From: no-reply@squadcal.org\r\n".
      "MIME-Version: 1.0\r\n".
      "Content-type: text/html; charset=iso-8859-1\r\n"
  );
}

// this is intended to be called when generating as hash
// generates row in verifications table
function generate_hash($user, $field) {
  global $conn;
  $result = $conn->query(
    "SELECT HEX(hash) AS hash FROM verifications ".
      "WHERE user = $user AND field = $field"
  );
  $verification_row = $result->fetch_assoc();
  if ($verification_row) {
    return strtolower($verification_row['hash']);
  }
  $hash = bin2hex(openssl_random_pseudo_bytes(4));
  $conn->query(
    "INSERT INTO verifications(user, field, hash) ".
      "VALUES($user, $field, UNHEX('$hash'))"
  );
  return $hash;
}

// this is intended to be called when verifying a hash
// deletes the row in verifications table and returns array(user id, field)
// if hash doesn't work then returns null
function verify_hash($hash) {
  global $conn;
  $hash = $conn->real_escape_string($hash);
  $result = $conn->query(
    "SELECT user, field FROM verifications WHERE hash = UNHEX('$hash')"
  );
  $row = $result->fetch_assoc();
  if (!$row) {
    return null;
  }
  $user = $row['user'];
  $field = $row['field'];
  // Delete all verifications since it's verified now
  $conn->query(
    "DELETE FROM verifications WHERE user = $user AND field = $field"
  );
  return array($user, $field);
}
