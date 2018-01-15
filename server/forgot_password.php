<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('verify_lib.php');

async_start();

if (!isset($_POST['username'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$username = $conn->real_escape_string($_POST['username']);

$query = <<<SQL
SELECT id, username, email
FROM users
WHERE LCASE(username) = LCASE('$username') OR LCASE(email) = LCASE('$username')
SQL;
$result = $conn->query($query);
$user_row = $result->fetch_assoc();
if (!$user_row) {
  async_end(array(
    'error' => 'invalid_user',
  ));
}
$id = $user_row['id'];
$username = $user_row['username'];
$email = $user_row['email'];

$code = generate_verification_code($id, VERIFY_FIELD_RESET_PASSWORD);
$link = $base_domain . $base_url . "verify/$code/";
$contents = <<<EMAIL
<html>
  <body style="font-family: sans-serif;">
    <p>
      We received a request to reset the password associated with your account
      $username on SquadCal. If you did not issue this request, you do not
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

async_end(array(
  'success' => true,
));
