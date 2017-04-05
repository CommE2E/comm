<?php

function recursive_utf8_encode($payload) {
  if (is_array($payload)) {
    foreach ($payload as $key => $value) {
      $payload[$key] = recursive_utf8_encode($value);
    }
    return $payload;
  } else if (is_string($payload)) {
    return utf8_decode($payload);
  }
  return $payload;
}

function utf8_json_encode($payload, $options = 0) {
  //return json_encode(recursive_utf8_encode($payload), $options | JSON_HEX_APOS|JSON_HEX_QUOT);
  return json_encode($payload, $options/* | JSON_HEX_APOS|JSON_HEX_QUOT*/);
}
