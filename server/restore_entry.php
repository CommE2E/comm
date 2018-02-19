<?php

require_once('call_node.php');

$_POST['input']['timestamp'] = intval($_POST['input']['timestamp']);

proxy_to_node('restore_entry');
