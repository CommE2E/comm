<?php

require_once('call_node.php');

if (!isset($_POST['input']['watchedIDs'])) {
  $_POST['input']['watchedIDs'] = array();
}

proxy_to_node('log_in');
