<?php

require_once('async_lib.php');
require_once('entry_lib.php');

async_start();

$entries = get_entry_infos($_POST);

if ($entries === null) {
  async_end(array(
    'error' => 'invalid_parameters',
  ));
}

async_end(array(
  'success' => true,
  'result' => $entries,
));
