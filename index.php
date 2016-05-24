<?php

require_once('config.php');
require_once('auth.php');

$month = isset($_GET['month'])
  ? (int)$_GET['month']
  : idate('m');
$year = isset($_GET['year'])
  ? (int)$_GET['year']
  : idate('Y');
$squad = isset($_GET['squad'])
  ? (int)$_GET['squad']
  : 254;
$month_beginning_timestamp = date_create("$month/1/$year");
if ($month < 1 || $month > 12) {
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}
list($cookie_id, $cookie_hash) = init_anonymous_cookie();

// First, validate the squad ID
$result = $conn->query(
  "SELECT sq.id, sq.name, ".
    "sq.hash IS NOT NULL AND su.squad IS NULL AS requires_auth ".
    "FROM squads sq LEFT JOIN subscriptions su ".
    "ON sq.id = su.squad AND su.subscriber = {$cookie_id}"
);
$squads = array();
$authorized_squads = array();
while ($row = $result->fetch_assoc()) {
  $squads[$row['id']] = $row['name'];
  $authorized_squads[$row['id']] = !$row['requires_auth'];
}
if (!isset($squads[$squad]) || !$authorized_squads[$squad]) {
  header(
    $_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error',
    true,
    500
  );
  exit;
}
$time = round(microtime(true) * 1000); // in milliseconds
$conn->query(
  "INSERT INTO subscriptions(squad, subscriber, last_view) ".
    "VALUES ($squad, $cookie_id, $time) ".
    "ON DUPLICATE KEY UPDATE last_view = $time"
);

// Fetch the actual text for each day
$days_in_month = $month_beginning_timestamp->format('t');
$text = array_fill(1, $days_in_month, '');
$result = $conn->query(
  "SELECT id, DAY(date) AS day, text FROM days ".
    "WHERE MONTH(date) = $month AND YEAR(date) = $year AND squad = $squad ".
    "ORDER BY date"
);
while ($row = $result->fetch_assoc()) {
  $text[$row['day']] = $row['text'];
}

?>
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
      <title>SquadCal</title>
      <link href="https://fonts.googleapis.com/css?family=Open+Sans:300|Anaheim" rel="stylesheet" type="text/css" />
      <link href="style.css" rel="stylesheet" type="text/css" />
      <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script>
      <script>
        var squad = <?=$squad?>;
        var month = <?=$month?>;
        var year = <?=$year?>;
        var authorized_squads = <?=json_encode($authorized_squads)?>;
        var base_url = "<?=$base_url?>";
      </script>
    </head>
    <body>
      <header>
        <h1>SquadCal</h1>
<?php

$month_name = $month_beginning_timestamp->format('F');

$prev_month = $month - 1;
$year_of_prev_month = $year;
if ($prev_month === 0) {
  $prev_month = 12;
  $year_of_prev_month = $year - 1;
}
$prev_url = "{$base_url}?month={$prev_month}&amp;year={$year_of_prev_month}&amp;squad={$squad}";

$next_month = $month + 1;
$year_of_next_month = $year;
if ($next_month === 13) {
  $next_month = 1;
  $year_of_next_month = $year + 1;
}
$next_url = "{$base_url}?month={$next_month}&amp;year={$year_of_next_month}&amp;squad={$squad}";

echo <<<HTML
          <div class="upper-right">
            <select id="squad_nav">

HTML;
foreach ($squads as $id => $name) {
  $selected = $id === $squad ? " selected" : "";
  echo <<<HTML
              <option value="$id"$selected>$name</option>

HTML;
}
echo <<<HTML
            </select>
          </div>
          <h2 class="upper-center">
            <a href="{$prev_url}">&lt;</a>
            $month_name $year
            <a href="{$next_url}">&gt;</a>
          </h2>
        </header>
        <table>
          <tr>
            <th>Sunday</th>
            <th>Monday</th>
            <th>Tuesday</th>
            <th>Wednesday</th>
            <th>Thursday</th>
            <th>Friday</th>
            <th>Saturday</th>
          </tr>

HTML;

$first_day_of_week = $month_beginning_timestamp->format('l');
$days_of_week = array(
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
);

$current_date = 1;
$day_of_week = array_shift($days_of_week);
$days_of_week[] = $day_of_week;
echo "          <tr>\n";
while ($day_of_week !== $first_day_of_week) {
  echo "            <td></td>\n";
  $day_of_week = array_shift($days_of_week);
  $days_of_week[] = $day_of_week;
}

$today_date = idate('d');
$today_month = idate('m');
$today_year = idate('Y');
for ($current_date = 1; $current_date <= $days_in_month; $current_date++) {
  if ($day_of_week === 'Sunday') {
    echo "          </tr>\n";
    echo "          <tr>\n";
  }
  $day_of_week = array_shift($days_of_week);
  $days_of_week[] = $day_of_week;
  if ($today_date === $current_date && $today_month === $month && $today_year === $year) {
    echo "            <td class='day current-day'>\n";
  } else {
    echo "            <td class='day'>\n";
  }
  echo "              <h2>$current_date</h2>\n";
  echo "              <textarea rows='3' id='$current_date'>{$text[$current_date]}</textarea>\n";
  echo "            </td>\n";
}

while ($day_of_week !== 'Sunday') {
  echo "            <td></td>\n";
  $day_of_week = array_shift($days_of_week);
  $days_of_week[] = $day_of_week;
}
echo "          </tr>\n";

?>
        </table>
        <div class="password-modal-overlay">
          <div class="password-modal">
            <div class="password-modal-header">
              <span class="password-modal-close">×</span>
              <h2>Password Required</h2>
            </div>
            <div class="password-modal-body">
              <form method="POST" id="password-modal-form">
                <input type="password" id="squad-password" placeholder="Password" />
                <input type="submit" id="password-submit" />
              </form>
          </div>
        </div>
        <script src="script.js"></script>
    </body>
</html>
