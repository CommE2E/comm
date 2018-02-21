<?php

require_once('call_node.php');

if (isset($_POST['input']['visibilityRules'])) {
  $_POST['input']['visibilityRules'] =
    intval($_POST['input']['visibilityRules']);
}

proxy_to_node('create_thread');
