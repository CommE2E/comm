<?php

require_once('auth.php');

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
  $body = substr($result, $header_size);
  return json_decode($body, true);
}
