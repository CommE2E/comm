<?php

require_once('config.php');

function verify_email($user, $username, $email) {
  global $base_url, $conn;

  // Do we already have a hash?
  $result = $conn->query(
    "SELECT HEX(hash) AS hash FROM verifications ".
      "WHERE user = $user AND field = 0"
  );
  $verification_row = $result->fetch_assoc();
  if ($verification_row) {
    $verify_hash = strtolower($verification_row['hash']);
  } else {
    $verify_hash = bin2hex(openssl_random_pseudo_bytes(4));
    $conn->query(
      "INSERT INTO verifications(user, field, hash) ".
        "VALUES($user, 0, UNHEX('$verify_hash'))" // field=0 means email field
    );
  }
  $link = $base_url . "?verify=$verify_hash";
  $contents = <<<EMAIL
<html>
  <body style="font-family: sans-serif;">
    <h3>Welcome to SquadCal, $username!</h3>
    <p>
      Please complete your registration and verify your email by
      clicking this link: $link
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
