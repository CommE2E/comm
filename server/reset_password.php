<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('verify_lib.php');
require_once('entry_lib.php');
require_once('message_lib.php');
require_once('user_lib.php');

async_start();

if (!isset($_POST['password']) || !isset($_POST['code'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$password = $_POST['password'];
if (trim($password) === '') {
  async_end(array(
    'error' => 'empty_password',
  ));
}

if (
  !empty($_POST['inner_entry_query']) &&
  !verify_entry_info_query($_POST['inner_entry_query'])
) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$code = $_POST['code'];
$verification_result = verify_code($code);
if (!$verification_result) {
  async_end(array(
    'error' => 'invalid_code',
  ));
}

list($user, $field) = $verification_result;
if ($field !== VERIFY_FIELD_RESET_PASSWORD) {
  async_end(array(
    'error' => 'invalid_code',
  ));
}

$result = $conn->query(
  "SELECT username, email, email_verified FROM users WHERE id = $user"
);
$user_row = $result->fetch_assoc();
if (!$user_row) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$hash = password_hash($password, PASSWORD_BCRYPT);
$conn->query("UPDATE users SET hash = '$hash' WHERE id = $user");

create_user_cookie($user);

clear_verify_codes($user, VERIFY_FIELD_RESET_PASSWORD);

$current_as_of = round(microtime(true) * 1000); // in milliseconds
$watched_ids = !empty($_POST['watched_ids']) && is_array($_POST['watched_ids'])
  ? $_POST['watched_ids']
  : array();
$thread_selection_criteria = array(
  "joined_threads" => true,
  "thread_ids" => array_fill_keys($watched_ids, false),
);

$message_result = get_message_infos(
  $thread_selection_criteria,
  DEFAULT_NUMBER_PER_THREAD
);
if (!$message_result) {
  async_end(array(
    'error' => 'internal_error',
  ));
}
$message_infos = $message_result['message_infos'];
$truncation_statuses = $message_result['truncation_statuses'];
$message_users = $message_result['user_infos'];

$return = array(
  'success' => true,
  'current_user_info' => array(
    'id' => (string)$user,
    'username' => $user_row['username'],
    'email' => $user_row['email'],
    'email_verified' => (bool)$user_row['email_verified'],
  ),
  'message_infos' => $message_infos,
  'truncation_status' => $truncation_statuses,
  'server_time' => $current_as_of,
);

$entry_users = array();
if (!empty($_POST['inner_entry_query'])) {
  $entry_result = get_entry_infos($_POST['inner_entry_query']);
  if ($entry_result !== null) {
    list($entries, $entry_users) = $entry_result;
    $return['entry_infos'] = $entries;
  }
}

$return['user_infos'] = combine_keyed_user_info_arrays(
  $message_users,
  $entry_users
);

async_end($return);
