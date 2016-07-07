<?php

require_once('config.php');
require_once('auth.php');

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
$squad = isset($_GET['squad'])
  ? (int)$_GET['squad']
  : 254;
$month_beginning_timestamp = date_create("$month/1/$year");
if ($month < 1 || $month > 12) {
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}
$viewer_id = get_viewer_id();

// First, validate the squad ID
$result = $conn->query(
  "SELECT sq.id, sq.name, sq.creator, ".
    "sq.hash IS NOT NULL AS requires_auth, su.squad IS NOT NULL AS is_authed ".
    "FROM squads sq LEFT JOIN subscriptions su ".
    "ON sq.id = su.squad AND su.subscriber = {$viewer_id}"
);
$squads = array();
$authorized_squads = array();
$viewer_is_squad_creator = false;
$squad_requires_auth = false;
while ($row = $result->fetch_assoc()) {
  $squads[$row['id']] = $row['name'];
  $authorized_squads[$row['id']] = $row['is_authed'] || !$row['requires_auth'];
  if ((int)$row['id'] === $squad) {
    $viewer_is_squad_creator = (int)$row['creator'] === $viewer_id;
    $squad_requires_auth = (bool)$row['requires_auth'];
  }
}
if (!isset($squads[$squad]) || !$authorized_squads[$squad]) {
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}
$time = round(microtime(true) * 1000); // in milliseconds
$conn->query(
  "INSERT INTO subscriptions(squad, subscriber, last_view) ".
    "VALUES ($squad, $viewer_id, $time) ".
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
      <link
        rel="stylesheet"
        type="text/css"
        href="https://fonts.googleapis.com/css?family=Open+Sans:300,600%7CAnaheim"
      />
      <link rel="stylesheet" type="text/css" href="style.css" />
      <script
        src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js"
      >
      </script>
      <script>
        var squad = <?=$squad?>;
        var squad_name = "<?=$squads[$squad]?>";
        var month = <?=$month?>;
        var year = <?=$year?>;
        var authorized_squads = <?=json_encode($authorized_squads)?>;
        var base_url = "<?=$base_url?>?year=<?=$year?>&month=<?=$month?>";
        var squad_requires_auth = <?=($squad_requires_auth ? 'true' : 'false')?>;
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
$prev_url = $base_url.
  "?month=".$prev_month.
  "&amp;year=".$year_of_prev_month.
  "&amp;squad=".$squad;

$next_month = $month + 1;
$year_of_next_month = $year;
if ($next_month === 13) {
  $next_month = 1;
  $year_of_next_month = $year + 1;
}
$next_url = $base_url.
  "?month=".$next_month.
  "&amp;year=".$year_of_next_month.
  "&amp;squad=".$squad;

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
if (user_logged_in()) {
  echo <<<HTML
            <option value="0">New squad...</option>

HTML;
}
echo <<<HTML
          </select>

HTML;
if ($viewer_is_squad_creator) {
  echo <<<HTML
          <div class="nav-button">
            <img id="squad" src="{$base_url}images/squad.svg" />
            <div class="nav-menu">
              <div>
                <a href="#" id="edit-squad-button">
                  Edit squad
                </a>
              </div>
              <div><a href="#" id="delete-squad-button">Delete squad</a></div>
            </div>
          </div>

HTML;
}
echo <<<HTML
          <div class="nav-button">
            <img id="account" src="{$base_url}images/account.svg" />
            <div class="nav-menu">

HTML;
if (user_logged_in()) {
  echo <<<HTML
              <div><a href="#" id="log-out-button">Log out</a></div>
              <div>
                <a href="#" id="user-settings-button">Change password</a>
              </div>
              <div><a href="#" id="delete-account-button">Delete account</a></div>

HTML;
} else {
  echo <<<HTML
              <div><a href="#" id="log-in-button">Log in</a></div>
              <div><a href="#" id="register-button">Register</a></div>

HTML;
}
echo <<<HTML
            </div>
          </div>
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
echo <<<HTML
        <tr>

HTML;

// If the first day of the month is Sunday, avoid creating an empty <tr> below
$first_sunday = $day_of_week === $first_day_of_week;

// Fill in the empty <td> before the 1st
while ($day_of_week !== $first_day_of_week) {
  echo <<<HTML
          <td></td>

HTML;
  $day_of_week = array_shift($days_of_week);
  $days_of_week[] = $day_of_week;
}

$today_date = idate('d');
$today_month = idate('m');
$today_year = idate('Y');
for ($current_date = 1; $current_date <= $days_in_month; $current_date++) {
  if ($day_of_week === 'Sunday') {
    if ($first_sunday) {
      $first_sunday = false;
    } else {
      echo <<<HTML
        </tr>
        <tr>

HTML;
    }
  }
  $day_of_week = array_shift($days_of_week);
  $days_of_week[] = $day_of_week;
  if (
    $today_date === $current_date &&
    $today_month === $month &&
    $today_year === $year
  ) {
    echo <<<HTML
          <td class='day current-day'>

HTML;
  } else {
    echo <<<HTML
          <td class='day'>

HTML;
  }
  echo <<<HTML
            <h2>$current_date</h2>
            <textarea rows='3' id='$current_date'>{$text[$current_date]}</textarea>
          </td>

HTML;
}

while ($day_of_week !== 'Sunday') {
  echo <<<HTML
          <td></td>

HTML;
  $day_of_week = array_shift($days_of_week);
  $days_of_week[] = $day_of_week;
}
echo <<<HTML
        </tr>

HTML;

?>
      </table>
      <div class="modal-overlay" id="concurrent-modification-modal-overlay">
        <div class="modal" id="concurrent-modification-modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Concurrent modification</h2>
          </div>
          <div class="modal-body">
            <p>
              It looks like somebody is attempting to modify that field at the
              same time as you! Please refresh the page and try again.
            </p>
            <div class="form-footer">
              <span class="modal-form-error"></span>
              <span class="form-submit">
                <input type="submit" value="Refresh" id="refresh-button" />
              </span>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="squad-login-modal-overlay">
        <div class="modal" id="squad-login-modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Password required</h2>
          </div>
          <div class="modal-body">
            <form method="POST">
              <div id="squad-login-name">
                <div class="form-title">Squad</div>
                <div class="form-content" id="squad-login-name"></div>
              </div>
              <div>
                <div class="form-title">Password</div>
                <div class="form-content">
                  <input
                    type="password"
                    id="squad-password"
                    placeholder="Password"
                  />
                </div>
              </div>
              <div class="form-footer">
                <span class="modal-form-error"></span>
                <span class="form-submit">
                  <input type="submit" value="Log in" />
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="log-in-modal-overlay">
        <div class="modal" id="log-in-modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Log in</h2>
          </div>
          <div class="modal-body">
            <form method="POST">
              <div>
                <div class="form-title">Username</div>
                <div class="form-content">
                  <input
                    type="text"
                    id="log-in-username"
                    placeholder="Username"
                  />
                </div>
              </div>
              <div>
                <div class="form-title">Password</div>
                <div class="form-content">
                  <input
                    type="password"
                    id="log-in-password"
                    placeholder="Password"
                  />
                </div>
              </div>
              <div class="form-footer">
                <span class="modal-form-error"></span>
                <span class="form-submit">
                  <input type="submit" value="Log in" />
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="register-modal-overlay">
        <div class="modal" id="register-modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Register</h2>
          </div>
          <div class="modal-body">
            <form method="POST">
              <div>
                <div class="form-title">Username</div>
                <div class="form-content">
                  <input
                    type="text"
                    id="register-username"
                    placeholder="Username"
                  />
                </div>
              </div>
              <div>
                <div class="form-title">Password</div>
                <div class="form-content">
                  <div>
                    <input
                      type="password"
                      id="register-password"
                      placeholder="Password"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      id="register-confirm-password"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              </div>
              <div class="form-footer">
                <span class="modal-form-error"></span>
                <span class="form-submit">
                  <input type="submit" value="Register" />
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="user-settings-modal-overlay">
        <div class="modal" id="user-settings-modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Change password</h2>
          </div>
          <div class="modal-body">
            <form method="POST">
              <div>
                <div class="form-title">New password</div>
                <div class="form-content">
                  <div>
                    <input
                      type="password"
                      id="change-new-password"
                      placeholder="New password"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      id="change-confirm-password"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>
              <div>
                <div class="form-title">Old password</div>
                <input
                  type="password"
                  id="change-old-password"
                  placeholder="Old password"
                />
              </div>
              <div class="form-footer">
                <span class="modal-form-error"></span>
                <span class="form-submit">
                  <input type="submit" value="Change password" />
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="delete-account-modal-overlay">
        <div class="modal" id="delete-account-modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Delete account</h2>
          </div>
          <div class="modal-body">
            <form method="POST">
              <p class="italic">
                Your account will be permanently deleted.
              </p>
              <div>
                <div class="form-title">Password</div>
                <div class="form-content">
                  <input
                    type="password"
                    id="delete-account-password"
                    placeholder="Password"
                  />
                </div>
              </div>
              <div class="form-footer">
                <span class="modal-form-error"></span>
                <span class="form-submit">
                  <input type="submit" value="Delete account" />
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="new-squad-modal-overlay">
        <div class="modal large-modal" id="new-squad-modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>New squad</h2>
          </div>
          <div class="modal-body">
            <form method="POST">
              <div>
                <div class="form-title">Squad name</div>
                <div class="form-content">
                  <input
                    type="text"
                    id="new-squad-name"
                    placeholder="Squad name"
                  />
                </div>
              </div>
              <div class="modal-radio-selector">
                <div class="form-title">Privacy</div>
                <div class="form-enum-selector">
                  <label>
                    <input
                      type="radio"
                      name="new-squad-type"
                      id="new-squad-open"
                      value="open"
                    />
                    <div class="form-enum-option">
                      Open
                      <div class="form-enum-description">
                        Anybody can view the contents of an open squad.
                      </div>
                    </div>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="new-squad-type"
                      id="new-squad-closed"
                      value="closed"
                    />
                    <div class="form-enum-option">
                      Closed
                      <div class="form-enum-description">
                        Only people with the password can view the contents of
                        a closed squad.
                      </div>
                      <div
                        class="form-enum-password hidden"
                        id="new-squad-password-container"
                      >
                        <input
                          type="password"
                          id="new-squad-password"
                          placeholder="Squad password"
                        />
                      </div>
                      <div
                        class="form-enum-password hidden"
                        id="new-squad-confirm-password-container"
                      >
                        <input
                          type="password"
                          id="new-squad-confirm-password"
                          placeholder="Confirm password"
                        />
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              <div class="form-footer">
                <span class="modal-form-error"></span>
                <span class="form-submit">
                  <input type="submit" value="Create squad" />
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="delete-squad-modal-overlay">
        <div class="modal" id="delete-squad-modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Delete squad</h2>
          </div>
          <div class="modal-body">
            <form method="POST">
              <p class="italic">
                Your squad will be permanently deleted.
              </p>
              <p>
                Enter password to your account, not your squad.
              </p>
              <div>
                <div class="form-title">Password</div>
                <div class="form-content">
                  <input
                    type="password"
                    id="delete-squad-password"
                    placeholder="Account password"
                  />
                </div>
              </div>
              <div class="form-footer">
                <span class="modal-form-error"></span>
                <span class="form-submit">
                  <input type="submit" value="Delete squad" />
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="edit-squad-modal-overlay">
        <div class="modal large-modal" id="edit-squad-modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Edit squad</h2>
          </div>
          <div class="modal-body">
            <form method="POST">
              <div>
                <div class="form-title">Squad name</div>
                <div class="form-content">
                  <input
                    type="text"
                    id="edit-squad-name"
                    value="<?=$squads[$squad]?>"
                  />
                </div>
              </div>
              <div class="modal-radio-selector">
                <div class="form-title">Privacy</div>
                <div class="form-enum-selector">
                  <label>
                    <input
                      type="radio"
                      name="edit-squad-type"
                      id="edit-squad-open"
                      value="open"
<?php
if (!$squad_requires_auth) {
  echo <<<HTML
                      checked

HTML;
}
echo <<<HTML
                    />
                    <div class="form-enum-option">
                      Open
                      <div class="form-enum-description">
                        Anybody can view the contents of an open squad.
                      </div>
                    </div>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="edit-squad-type"
                      id="edit-squad-closed"
                      value="closed"

HTML;
if ($squad_requires_auth) {
  echo <<<HTML
                      checked

HTML;
}
echo <<<HTML
                    />
                    <div class="form-enum-option">
                      Closed
                      <div class="form-enum-description">
                        Only people with the password can view the contents of
                        a closed squad.
                      </div>
                      <div
                        class="form-enum-password
HTML;
if (!$squad_requires_auth) {
  echo " hidden";
}
$optional = $squad_requires_auth ? " (optional)" : "";
echo <<<HTML
"
                        id="edit-squad-new-password-container"
                      >
                        <input
                          type="password"
                          id="edit-squad-new-password"
                          placeholder="New squad password{$optional}"
                        />
                      </div>
                      <div
                        class="form-enum-password
HTML;
if (!$squad_requires_auth) {
  echo " hidden";
}
echo <<<HTML
"
                        id="edit-squad-confirm-password-container"
                      >
                        <input
                          type="password"
                          id="edit-squad-confirm-password"
                          placeholder="Confirm squad password{$optional}"
                        />
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <div class="form-title">Account password</div>
                <div class="form-content">
                  <input
                    type="password"
                    id="edit-squad-personal-password"
                    placeholder="Personal account password"
                  />
                </div>
              </div>
              <div class="form-footer">
                <span class="modal-form-error"></span>
                <span class="form-submit">
                  <input type="submit" value="Update squad" />
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>

HTML;
?>
      <script src="script.js"></script>
    </body>
</html>
