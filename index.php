<?php

require_once('config.php');
require_once('auth.php');
require_once('verify.php');

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}

$month = isset($_GET['month'])
  ? (int)$_GET['month']
  : idate('m');
$year = isset($_GET['year'])
  ? (int)$_GET['year']
  : idate('Y');
$home = isset($_GET['home']);
if ($home) {
  $squad = null;
} else if (isset($_GET['squad'])) {
  $squad = (int)$_GET['squad'];
} else {
  $squad = 254;
}
$month_beginning_timestamp = date_create("$month/1/$year");
if ($month < 1 || $month > 12) {
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}
$viewer_id = get_viewer_id();

$query_string = array();
parse_str($_SERVER['QUERY_STRING'], $query_string);
$show = null;
if (isset($query_string['show'])) {
  $show = $query_string['show'];
}
$verify = null;
if (isset($query_string['verify'])) {
  $verify = $query_string['verify'];
}

$reset_password_username = null;
if ($verify) {
  $verification_result = verify_code($verify);
  if ($verification_result) {
    list($verified_user, $verified_field) = $verification_result;
    if ($verified_field === VERIFY_FIELD_EMAIL) {
      $conn->query(
        "UPDATE users SET email_verified = 1 WHERE id = $verified_user"
      );
      clear_verify_codes($verified_user, $verified_field);
      $show = 'verified_email';
    } else if ($verified_field === VERIFY_FIELD_RESET_PASSWORD) {
      $show = 'reset_password';
      $result = $conn->query(
        "SELECT username FROM users WHERE id = $verified_user"
      );
      $reset_password_user_row = $result->fetch_assoc();
      $reset_password_username = $reset_password_user_row['username'];
    }
  }
}

$result = $conn->query(
  "SELECT s.id, s.name, r.role, s.hash IS NOT NULL AS requires_auth, ".
    "r.squad IS NOT NULL AND r.role >= ".ROLE_SUCCESSFUL_AUTH." AS is_authed, ".
    "r.subscribed, s.color, s.description FROM squads s ".
    "LEFT JOIN roles r ON r.squad = s.id AND r.user = {$viewer_id}"
);
$rows = array();
$subscription_exists = false;
while ($row = $result->fetch_assoc()) {
  $rows[] = $row;
  $authorized = $row['is_authed'] || !$row['requires_auth'];
  $subscribed_authorized = $authorized && $row['subscribed'];
  if ($subscribed_authorized) {
    $subscription_exists = true;
  }
}
if (!isset($_GET['squad']) && $subscription_exists) {
  // If we defaulted to squad 254 but a subscription exists, default to home
  $home = true;
  $squad = null;
}

$squad_infos = array();
foreach ($rows as $row) {
  $authorized = $row['is_authed'] || !$row['requires_auth'];
  $subscribed_authorized = $authorized && $row['subscribed'];
  $onscreen = ($home && $subscribed_authorized) ||
    (!$home && (int)$row['id'] === $squad);
  $squad_infos[$row['id']] = array(
    'id' => $row['id'],
    'name' => $row['name'],
    'description' => $row['description'],
    'authorized' => $authorized,
    'subscribed' => $subscribed_authorized,
    'editable' => (int)$row['role'] >= ROLE_CREATOR,
    'closed' => (bool)$row['requires_auth'],
    'onscreen' => $onscreen,
    'color' => $row['color'],
  );
}
if (
  ($home && !$subscription_exists) ||
  (!$home &&
    (!isset($squad_infos[$squad]) || !$squad_infos[$squad]['authorized']))
) {
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}
$current_nav_name = $home ? "Home" : $squad_infos[$squad]['name'];

if ($squad !== null) {
  $time = round(microtime(true) * 1000); // in milliseconds
  $conn->query(
    "INSERT INTO roles(squad, user, last_view, role, subscribed) ".
      "VALUES ($squad, $viewer_id, $time, ".ROLE_VIEWED.", 0) ON DUPLICATE KEY ".
      "UPDATE last_view = GREATEST(VALUES(last_view), last_view), ".
      "role = GREATEST(VALUES(role), role), ".
      "subscribed = GREATEST(VALUES(subscribed), subscribed)"
  );
}

// Get the username
$username = null;
$email = null;
$email_verified = null;
if (user_logged_in()) {
  $result = $conn->query(
    "SELECT username, email, email_verified FROM users WHERE id = $viewer_id"
  );
  $user_row = $result->fetch_assoc();
  $username = $user_row['username'];
  $email = $user_row['email'];
  $email_verified = $user_row['email_verified'];
}

// Fetch the actual text for each day
$days_in_month = $month_beginning_timestamp->format('t');
$entries = array_fill(1, $days_in_month, array());
if ($home) {
  $result = $conn->query(
    "SELECT e.id AS entry_id, DAY(d.date) AS day, e.text, e.creation_time, ".
      "d.squad FROM entries e ".
      "LEFT JOIN days d ON d.id = e.day ".
      "LEFT JOIN roles r ON r.squad = d.squad AND r.user = $viewer_id ".
      "WHERE MONTH(d.date) = $month AND YEAR(d.date) = $year AND ".
      "r.subscribed = 1 AND e.deleted = 0 ORDER BY d.date, e.creation_time"
  );
} else {
  $result = $conn->query(
    "SELECT e.id AS entry_id, DAY(d.date) AS day, e.text, e.creation_time, ".
      "d.squad FROM entries e ".
      "LEFT JOIN days d ON d.id = e.day ".
      "WHERE MONTH(d.date) = $month AND YEAR(d.date) = $year AND ".
      "d.squad = $squad AND e.deleted = 0 ORDER BY d.date, e.creation_time"
  );
}
while ($row = $result->fetch_assoc()) {
  $entry_squad = intval($row['squad']);
  if (!$squad_infos[$entry_squad]['authorized']) {
    continue;
  }
  $day = intval($row['day']);
  $entry = intval($row['entry_id']);
  $entries[$day][$entry] = array(
    "id" => (string)$entry,
    "squadID" => (string)$entry_squad,
    "text" => $row['text'],
    "year" => $year,
    "month" => $month,
    "day" => $day,
    "creationTime" => intval($row['creation_time']),
  );
}

$month_url = "$base_url?year=$year&month=$month";
$url_suffix = $home ? "home" : "squad=$squad";
$this_url = "$month_url&$url_suffix";

?>
<!DOCTYPE html>
<html lang="en" class="no-js">
  <head>
    <meta charset="utf-8" />
    <title>SquadCal</title>
    <link
      rel="stylesheet"
      type="text/css"
      href="https://fonts.googleapis.com/css?family=Open+Sans:300,600%7CAnaheim"
    />
    <link rel="stylesheet" type="text/css" href="style.css" />
    <link rel="stylesheet" type="text/css" href="spectrum.css" />
    <script>
      var username = "<?=$username?>";
      var email = "<?=$email?>";
      var email_verified = <?=($email_verified ? "true" : "false")?>;
      var squad_infos = <?=json_encode($squad_infos, JSON_FORCE_OBJECT)?>;
      var entry_infos = <?=json_encode($entries, JSON_FORCE_OBJECT)?>;
      var month = <?=$month?>;
      var year = <?=$year?>;
      var month_url = "<?=$month_url?>";
      var this_url = "<?=$this_url?>";
      var base_url = "<?=$base_url?>";
      var show = "<?=$show?>";
      var verify = "<?=$verify?>";
      var reset_password_username = "<?=$reset_password_username?>";
      var original_nav = "<?=($home ? 'home' : $squad)?>";
      var current_nav_name = "<?=$current_nav_name?>";
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
            class="js-loading"
            src="{$base_url}images/ajax-loader.gif"
            alt="loading"
          />
        </div>
        <div class="lower-left">
          <div class="nav-button">

HTML;
if (user_logged_in()) {
  echo <<<HTML
            logged in as
            <span class="username">$username</span>
            <div class="nav-menu">
              <div><a href="#">Log out</a></div>
              <div><a href="#">Edit account</a></div>
            </div>

HTML;
} else {
  echo <<<HTML
            <a href="#">Log in</a> ·
            <a href="#">Register</a>

HTML;
}

$month_name = $month_beginning_timestamp->format('F');

$prev_month = $month - 1;
$year_of_prev_month = $year;
if ($prev_month === 0) {
  $prev_month = 12;
  $year_of_prev_month = $year - 1;
}
$prev_url = $base_url.
  "?month=".$prev_month.
  "&amp;year=".$year_of_prev_month.
  "&amp;".$url_suffix;

$next_month = $month + 1;
$year_of_next_month = $year;
if ($next_month === 13) {
  $next_month = 1;
  $year_of_next_month = $year + 1;
}
$next_url = $base_url.
  "?month=".$next_month.
  "&amp;year=".$year_of_next_month.
  "&amp;".$url_suffix;

echo <<<HTML
          </div>
        </div>
        <h2 class="upper-center">
          <a href="{$prev_url}">&lt;</a>
          $month_name $year
          <a href="{$next_url}">&gt;</a>
        </h2>
      </header>
    </div>

HTML;
if (DEV) {
  echo <<<HTML
    <script src="js/jspm_packages/system.js"></script>
    <script src="js/config.js"></script>
    <script>
      System.import("script.js");
    </script>

HTML;
} else {
  echo <<<HTML
    <script src="js/build.js"></script>

HTML;
}
?>
  </body>
</html>
