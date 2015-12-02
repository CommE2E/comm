<?php

$base_url = "http://ashoat.tevosyan.com/squadcal/";
$month = isset($_GET['month'])
  ? (int)$_GET['month']
  : date('n');
$year = isset($_GET['year'])
  ? (int)$_GET['year']
  : date('Y');
$current_date = date('j');
$month_beginning_timestamp = strtotime("$month/1/$year");

?>
<!DOCTYPE html> 
<html lang="en"> 
    <head> 
        <meta charset="utf-8" /> 
            <style type="text/css">
                table {
                  height: 100%;
                  width: 100%;
                }
                textarea {
                  width: 95%;
                }
                h2 {
                  padding-top: 0px;
                  padding-bottom: 0px;
                  margin-top: 0px;
                  margin-bottom: 0px;
                }
            </style>
        <title>SquadCal</title>
    </head>
    <body>
        <h1>squaaaaaaaaaaa</h1>
<?php

$month_name = date('F', $month_beginning_timestamp);

$prev_month = $month - 1;
$year_of_prev_month = $year;
if ($prev_month === 0) {
  $prev_month = 12;
  $year_of_prev_month = $year - 1;
}
$prev_url = "{$base_url}?month={$prev_month}&year={$year_of_prev_month}";

$next_month = $month + 1;
$year_of_next_month = $year;
if ($next_month === 13) {
  $next_month = 1;
  $year_of_next_month = $year + 1;
}
$next_url = "{$base_url}?month={$next_month}&year={$year_of_next_month}";

echo "<h2 style='text-align: center'>";
echo "<a href=\"{$prev_url}\">&lt;</a>";
echo " $month_name $year ";
echo "<a href=\"{$next_url}\">&gt;</a>";
echo "</h2>";

?>
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
<?php

$days_in_month = date('t', $month_beginning_timestamp);

$first_day_of_week = date('l', $month_beginning_timestamp);
$days_of_week = array(
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
);

$current_day = 1;
$day_of_week = array_shift($days_of_week);
$days_of_week[] = $day_of_week;
echo '<tr>';
while ($day_of_week !== $first_day_of_week) {
  echo "<td></td>";
  $day_of_week = array_shift($days_of_week);
  $days_of_week[] = $day_of_week;
}
  
for ($current_day = 1; $current_day <= $days_in_month; $current_day++) {
  if ($day_of_week === 'Sunday') {
    echo '</tr><tr>';
  }
  $day_of_week = array_shift($days_of_week);
  $days_of_week[] = $day_of_week;
  echo '<td><h2>';
  echo $current_day;
  echo '</h2><textarea rows=3></textarea></td>';
}
echo '</tr>';

?>
        </table>
    </body>
</html>
