<?php

require_once('call_node.php');

if (isset($_POST['input']['changes']['visibilityRules'])) {
  $_POST['input']['changes']['visibilityRules'] =
    intval($_POST['input']['changes']['visibilityRules']);
}

proxy_to_node('update_thread');
