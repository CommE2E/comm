<?php

require_once('config.php');
require_once('auth.php');
require_once('verify.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  exit(json_encode(array(
    'error' => 'tls_failure',
  )));
}

if (user_logged_in()) {
  exit(json_encode(array(
    'error' => 'already_logged_in',
  )));
}
if (!isset($_POST['username'])) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$username = $_POST['username'];

$result = $conn->query(
  "SELECT id, username, email ".
    "FROM users WHERE username = '$username' OR email = '$username'"
);
$user_row = $result->fetch_assoc();
if (!$user_row) {
  exit(json_encode(array(
    'error' => 'invalid_user',
  )));
}
$id = $user_row['id'];
$username = $user_row['username'];
$email = $user_row['email'];

$code = generate_verification_code($id, VERIFY_FIELD_RESET_PASSWORD);
$link = $base_url . "?verify=$code";
$contents = <<<EMAIL
<html>
  <body style="font-family: sans-serif;">
    <p>
      We received a request to reset the password associated with your account
      ($username) on SquadCal. If you did not issue this request, you do not
      need to do anything, and your password will remain the same. However, if
      you did issue this request, please visit this link to reset your password:
      <a href="$link">$link</a>
    </p>
  </body>
</html>
EMAIL;
mail(
  $email,
  'Reset password for SquadCal',
  $contents,
  "From: no-reply@squadcal.org\r\n".
    "MIME-Version: 1.0\r\n".
    "Content-type: text/html; charset=iso-8859-1\r\n"
);

exit(json_encode(array(
  'success' => true,
)));

