<?php

require_once('config.php');

// the thing being verified
define('VERIFY_FIELD_EMAIL', 0);
define('VERIFY_FIELD_RESET_PASSWORD', 1);

function verify_email($user, $username, $email, $welcome=false) {
  global $base_domain, $base_url, $conn;

  $code = generate_verification_code($user, VERIFY_FIELD_EMAIL);
  $link = $base_domain . $base_url . "verify/$code/";
  $contents = <<<EMAIL
<html>
  <body style="font-family: sans-serif;">

EMAIL;
  $action = "verify your email";
  if ($welcome) {
    $contents .= <<<EMAIL
    <h3>Welcome to SquadCal, $username!</h3>

EMAIL;
    $action = "complete your registration and ".$action;
  }
  $contents .= <<<EMAIL
    <p>
      Please $action by clicking this link:
      <a href="$link">$link</a>
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

// generates row in verifications table with hash of code
// returns hex containing verification ID and code
function generate_verification_code($user, $field) {
  global $conn;
  $code = bin2hex(openssl_random_pseudo_bytes(4));
  $hash = password_hash($code, PASSWORD_BCRYPT);
  $conn->query("INSERT INTO ids(table_name) VALUES('cookies')");
  $id = $conn->insert_id;
  $time = round(microtime(true) * 1000); // in milliseconds
  $conn->query(
    "INSERT INTO verifications(id, user, field, hash, creation_time) ".
      "VALUES($id, $user, $field, '$hash', $time)"
  );
  return $code . dechex($id);
}

// returns array(user id, field)
// if code doesn't work then returns null
function verify_code($hex) {
  global $conn, $verify_code_lifetime;

  $code = substr($hex, 0, 8);
  $id = hexdec(substr($hex, 8));

  $result = $conn->query(
    "SELECT hash, user, field, creation_time ".
      "FROM verifications WHERE id = $id"
  );
  $row = $result->fetch_assoc();
  if (!$row || !password_verify($code, $row['hash'])) {
    return null;
  }

  $time = round(microtime(true) * 1000); // in milliseconds
  if ($row['creation_time'] + $verify_code_lifetime * 1000 < $time) {
    // Code is expired. Delete it...
    $conn->query("DELETE FROM verifications WHERE id = $id");
    $conn->query("DELETE FROM ids WHERE id = $id");
    return null;
  }

  return array((int)$row['user'], (int)$row['field']);
}

// Call this function after a successful verification
function clear_verify_codes($user, $field) {
  global $conn;
  $result = $conn->query(
    "SELECT id FROM verifications WHERE user = $user AND field = $field"
  );
  $delete_ids = array();
  while ($row = $result->fetch_assoc()) {
    $delete_ids[] = "id = ".$row['id'];
  }
  if ($delete_ids) {
    $conn->query("DELETE FROM ids WHERE ".implode(' OR ', $delete_ids));
  }
  $conn->query(
    "DELETE FROM verifications WHERE user = $user AND field = $field"
  );
}
