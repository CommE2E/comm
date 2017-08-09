<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');

async_start();

if (!user_logged_in()) {
  async_end(array(
    'error' => 'not_logged_in',
  ));
}
if (!isset($_POST['thread']) || !isset($_POST['password'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$user = get_viewer_id();
$thread = (int)$_POST['thread'];
$password = $_POST['password'];

$role_creator = ROLE_CREATOR;
$query = <<<SQL
SELECT u.hash
FROM roles r
LEFT JOIN users u ON u.id = r.user
WHERE r.thread = {$thread}
  AND r.user = {$user}
  AND r.role >= {$role_creator}
SQL;
$result = $conn->query($query);
$row = $result->fetch_assoc();
if (!$row) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
if (!password_verify($password, $row['hash'])) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

$conn->query(
  "DELETE t, ic, d, id, e, ie, re, ir, ro FROM threads t ".
    "LEFT JOIN ids ic ON ic.id = t.id ".
    "LEFT JOIN days d ON d.thread = t.id ".
    "LEFT JOIN ids id ON id.id = d.id ".
    "LEFT JOIN entries e ON e.day = d.id ".
    "LEFT JOIN ids ie ON ie.id = e.id ".
    "LEFT JOIN revisions re ON re.entry = e.id ".
    "LEFT JOIN ids ir ON ir.id = re.id ".
    "LEFT JOIN roles ro ON ro.thread = t.id ".
    "WHERE t.id = $thread"
);

async_end(array(
  'success' => true,
));
