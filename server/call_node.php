<?php

require_once('auth.php');
require_once('async_lib.php');

function call_node($path, $blob) {
  $url = "http://localhost:3000/" . $path;
  $json = json_encode($blob);
  list($_, $_, $_, $cookie) = get_viewer_info();

  $ch = curl_init($url);
  curl_setopt($ch, CURLOPT_HEADER, 1);
  curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
  curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
  curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'Content-Length: ' . strlen($json),
  ));
  curl_setopt($ch, CURLOPT_COOKIESESSION, true);
  curl_setopt($ch, CURLOPT_COOKIE, $cookie);

  $result = curl_exec($ch);
  $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
  $header_array = explode("\r\n", substr($result, 0, $header_size));
  foreach ($header_array as $header) {
    if (strpos($header, "Set-Cookie: ") === 0) {
      header($header);
    }
  }

  $body = substr($result, $header_size);
  return json_decode($body, true);
}

function proxy_to_node($path) {
  async_start();

  if (isset($_POST['input'])) {
    $payload = fix_bools($_POST['input']);
  } else {
    $payload = (object)array();
  }

  async_end(call_node($path, $payload));
}

function fix_bools($input) {
  $result = array();
  foreach ($input as $key => $value) {
    if (is_array($value)) {
      $result[$key] = fix_bools($value);
    } else if ($value === "true") {
      $result[$key] = true;
    } else if ($value === "false") {
      $result[$key] = false;
    } else {
      $result[$key] = $value;
    }
  }
  return $result;
}
