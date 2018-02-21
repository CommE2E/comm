<?php

require_once('call_node.php');

if (isset($_POST['input']['numberPerThread'])) {
  $_POST['input']['numberPerThread'] =
    intval($_POST['input']['numberPerThread']);
}

proxy_to_node('fetch_messages');
