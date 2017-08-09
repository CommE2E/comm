<?php

require_once('async_lib.php');
require_once('entry_lib.php');

async_start();

if (!verify_entry_info_query($_POST)) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

$entry_result = get_entry_infos($_POST);
if ($entry_result === null) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

list($entries, $users) = $entry_result;
async_end(array(
  'success' => true,
  'entry_infos' => $entries,
  'user_infos' => array_values($users),
));
