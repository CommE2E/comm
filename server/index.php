<?php

require_once('config.php');
require_once('auth.php');
require_once('verify_lib.php');
require_once('thread_lib.php');
require_once('message_lib.php');
require_once('entry_lib.php');
require_once('user_lib.php');
require_once('permissions.php');

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}

$year_rewrite_matched = preg_match(
  '#/year/([0-9]+)(/|$)#i',
  $_SERVER['REQUEST_URI'],
  $year_matches
);
$year = $year_rewrite_matched ? (int)$year_matches[1] : idate('Y');
$month_rewrite_matched = preg_match(
  '#/month/([0-9]+)(/|$)#i',
  $_SERVER['REQUEST_URI'],
  $month_matches
);
$month = $month_rewrite_matched ? (int)$month_matches[1] : idate('m');
$thread_rewrite_matched = preg_match(
  '#/thread/([0-9]+)(/|$)#i',
  $_SERVER['REQUEST_URI'],
  $thread_matches
);
$home_rewrite_matched = preg_match('#/home(/|$)#i', $_SERVER['REQUEST_URI']);
if (!$home_rewrite_matched && $thread_rewrite_matched) {
  $home = false;
  $thread = (int)$thread_matches[1];;
} else {
  $home = true;
  $thread = null;
}

list($thread_infos, $thread_users) = get_thread_infos();
if (!$home && !isset($thread_infos[$thread]) && !verify_thread_id($thread)) {
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}

$month_beginning_timestamp = date_create("$month/1/$year");
if ($month < 1 || $month > 12) {
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}

$null_state = null;
if ($home) {
  $null_state = true;
  foreach ($thread_infos as $thread_info) {
    if ($thread_info['currentUser']['subscribed']) {
      $null_state = false;
      break;
    }
  }
} else if (!isset($thread_infos[$thread])) {
  $null_state = true;
} else {
  $permissions = $thread_infos[$thread]['currentUser']['permissions'];
  $null_state = !$permissions[PERMISSION_VISIBLE]['value'];
}

$verify_rewrite_matched = preg_match(
  '#/verify/([a-f0-9]+)(/|$)#i',
  $_SERVER['REQUEST_URI'],
  $verify_matches
);
$verify_code = $verify_rewrite_matched ? $verify_matches[1] : null;

$reset_password_username = null;
$verify_field = null;
if ($verify_code) {
  $verify_result = verify_code($verify_code);
  if ($verify_result) {
    list($verify_user, $verify_field) = $verify_result;
    if ($verify_field === VERIFY_FIELD_EMAIL) {
      $conn->query(
        "UPDATE users SET email_verified = 1 WHERE id = $verify_user"
      );
      clear_verify_codes($verify_user, $verify_field);
    } else if ($verify_field === VERIFY_FIELD_RESET_PASSWORD) {
      $result = $conn->query(
        "SELECT username FROM users WHERE id = $verify_user"
      );
      $reset_password_user_row = $result->fetch_assoc();
      $reset_password_username = $reset_password_user_row['username'];
    }
  }
}

$user_info = get_user_info();
if ($user_info === null) {
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}
$username = isset($user_info['username']) ? $user_info['username'] : null;

// Fetch the actual text for each day
$month_fragment = $month < 10 ? "0{$month}" : (string)$month;
$start_date = "{$year}-{$month_fragment}-01";
$start_date_time = strtotime($start_date);
$end_date = date('Y-m-t', $start_date_time);
$entry_result = get_entry_infos(array(
  'start_date' => $start_date,
  'end_date' => $end_date,
  'nav' => $home ? "home" : (string)$thread,
));
if (!$entry_result) {
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}
list($entries, $entry_users) = $entry_result;

$current_as_of = round(microtime(true) * 1000); // in milliseconds
$thread_selection_criteria = array("joined_threads" => true);
$message_result = get_message_infos(
  $thread_selection_criteria,
  DEFAULT_NUMBER_PER_THREAD
);
if (!$message_result) {
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}
list($message_infos, $truncation_status, $message_users) = $message_result;

$users = array_merge(
  $message_users,
  $entry_users,
  $thread_users
);

if (!$thread_infos) {
  // Casting empty array to object guarantees JSON encoding as {} rather than []
  $thread_infos = (object)$thread_infos;
}

$fonts_css_url = DEV
  ? "fonts/local-fonts.css"
  : "https://fonts.googleapis.com/css?family=Open+Sans:300,600%7CAnaheim";

echo <<<HTML
<!DOCTYPE html>
<html lang="en" class="no-js">
  <head>
    <meta charset="utf-8" />
    <title>SquadCal</title>
    <base href="{$base_url}" />
    <link rel="stylesheet" type="text/css" href="{$fonts_css_url}" />
    <link rel="stylesheet" type="text/css" href="basic.css" />

HTML;
if (!DEV) {
  echo <<<HTML
    <link rel="stylesheet" type="text/css" href="dist/prod.build.css" />

HTML;
}
?>
    <script>
      var current_user_info = <?=json_encode($user_info, JSON_FORCE_OBJECT)?>;
      var thread_infos = <?=json_encode($thread_infos)?>;
      var entry_infos = <?=json_encode($entries)?>;
      var month = <?=$month?>;
      var year = <?=$year?>;
      var base_url = "<?=$base_url?>";
      var verify_code = <?=$verify_code !== null ? "'$verify_code'" : "null"?>;
      var verify_field = <?=$verify_field !== null ? $verify_field : 'null'?>;
      var reset_password_username = "<?=$reset_password_username?>";
      var home = <?=$home ? 'true' : 'false'?>;
      var thread_id = <?=$thread ? "'$thread'" : "null"?>;
      var current_as_of = <?=$current_as_of?>;
      var message_infos = <?=json_encode($message_infos)?>;
      var truncation_status = <?=json_encode($truncation_status)?>;
      var user_infos = <?=json_encode($users, JSON_FORCE_OBJECT)?>;
    </script>
  </head>
  <body>
<?php

echo <<<HTML
    <div id="react-root">
      <header>
        <h1>SquadCal</h1>
        <div class="upper-right">
          <img
            class="page-loading"
            src="images/ajax-loader.gif"
            alt="loading"
          />
        </div>
        <div class="lower-left">
          <div class="account-button">

HTML;
if (user_logged_in()) {
  echo <<<HTML
            <span>logged in as $username</span>

HTML;
} else {
  echo <<<HTML
            <span>Log in · Register</span>

HTML;
}

$month_name = $month_beginning_timestamp->format('F');

echo <<<HTML
          </div>
        </div>
        <h2 class="upper-center">
          $month_name $year
        </h2>
      </header>

HTML;
if ($null_state) {
  echo <<<HTML
      <div class="modal-overlay"></div>

HTML;
}
echo <<<HTML
    </div>

HTML;
if (DEV) {
  echo <<<HTML
    <script src="dist/dev.build.js"></script>

HTML;
} else {
  echo <<<HTML
    <script src="dist/prod.build.js"></script>

HTML;
}
?>
  </body>
</html>
