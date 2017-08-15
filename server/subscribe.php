<?php

require_once('async_lib.php');
require_once('config.php');
require_once('auth.php');
require_once('thread_lib.php');

async_start();

if (!isset($_POST['thread']) || !isset($_POST['subscribe'])) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
$thread = (int)$_POST['thread'];
$new_subscribed = !!$_POST['subscribe'];

$can_see = viewer_can_see_thread($thread);
if ($can_see === null) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}
if (!$can_see) {
  async_end(array(
    'error' => 'invalid_credentials',
  ));
}

$viewer_id = get_viewer_id();
$roles = array(array(
  "user" => $viewer_id,
  "thread" => $thread,
  "role" => $new_subscribed ? ROLE_SUCCESSFUL_AUTH : ROLE_VIEWED,
  "subscribed" => $new_subscribed,
));
if ($new_subscribed) {
  $extra_roles = get_extra_roles_for_joined_thread_id(
    $thread,
    array($viewer_id)
  );
  if ($extra_roles === null) {
    async_end(array(
      'error' => 'unknown_error',
    ));
  }
  $roles = array_merge($roles, $extra_roles);
}
create_user_roles($roles);

async_end(array(
  'success' => true,
));
