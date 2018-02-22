<?php

require_once('call_node.php');

$_POST['input']['lastPing'] = intval($_POST['input']['lastPing']);
if (!isset($_POST['input']['watchedIDs'])) {
  $_POST['input']['watchedIDs'] = array();
}

proxy_to_node('ping');
