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
$squad = isset($_GET['squad'])
  ? (int)$_GET['squad']
  : 254;
$month_beginning_timestamp = date_create("$month/1/$year");
if ($month < 1 || $month > 12) {
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}
$viewer_id = get_viewer_id();

$query_string = array();
$show = null;
parse_str($_SERVER['QUERY_STRING'], $query_string);
if (isset($query_string['show'])) {
  $show = $query_string['show'];
}
$verified_user = 0;
if (isset($query_string['verify'])) {
  $verification_result = verify_code($query_string['verify']);
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
    }
  }
}

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
$text = array_fill(1, $days_in_month, '');
$result = $conn->query(
  "SELECT d.id, DAY(d.date) AS day, e.text FROM days d ".
    "LEFT JOIN entries e ON e.day = d.id ".
    "WHERE MONTH(d.date) = $month AND YEAR(d.date) = $year ".
    "AND d.squad = $squad ORDER BY d.date"
);
while ($row = $result->fetch_assoc()) {
  $text[$row['day']] = $row['text'];
}

$month_url = "$base_url?year=$year&month=$month";
$this_url = "$month_url&squad=$squad";

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
        var email = "<?=$email?>";
        var squad_name = "<?=$squads[$squad]?>";
        var month = <?=$month?>;
        var year = <?=$year?>;
        var authorized_squads = <?=json_encode($authorized_squads)?>;
        var month_url = "<?=$month_url?>";
        var this_url = "<?=$this_url?>";
        var squad_requires_auth = <?=($squad_requires_auth ? 'true' : 'false')?>;
        var show = "<?=$show?>";
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

HTML;
if ($viewer_is_squad_creator) {
  echo <<<HTML
          <div class="nav-button">
            <img
              id="squad"
              src="{$base_url}images/squad.svg"
              alt="squad settings"
            />
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
          <select id="squad-nav">

HTML;
foreach ($squads as $id => $name) {
  $selected = $id === $squad ? " selected" : "";
  echo <<<HTML
            <option value="$id"$selected>$name</option>

HTML;
}
echo <<<HTML
            <option value="0">New squad...</option>
          </select>
          <div class="nav-button">
            <img
              id="account"
              src="{$base_url}images/account.svg"
              alt="account settings"
            />

HTML;
if ($username) {
  echo <<<HTML
            <span id="username">$username</span>

HTML;
}
echo <<<HTML
            <div class="nav-menu">

HTML;
if (user_logged_in()) {
  echo <<<HTML
              <div><a href="#" id="log-out-button">Log out</a></div>
              <div><a href="#" id="user-settings-button">Edit account</a></div>
              <div>
                <a href="#" id="delete-account-button">Delete account</a>
              </div>

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
      </table>

HTML;
?>
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
              <div class="form-text" id="squad-login-name">
                <div class="form-title">Squad</div>
                <div class="form-content"></div>
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
              <p class="form-pre-footer">
                Or <a href="#" class="show-login-modal">log in</a>
                to your account if you already have access
              </p>
              <div class="form-footer">
                <span class="modal-form-error"></span>
                <span class="form-submit">
                  <input type="submit" value="Submit" />
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
<?php
if (!user_logged_in()) {
  echo <<<HTML
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
                    placeholder="Username or email"
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
                  <div class="form-subtitle">
                    <a href="#" id="forgot-password-button">Forgot password?</a>
                  </div>
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
                <div class="form-title">Email</div>
                <div class="form-content">
                  <input
                    type="text"
                    id="register-email"
                    placeholder="Email"
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
      <div class="modal-overlay" id="forgot-password-modal-overlay">
        <div class="modal" id="forgot-password-modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Reset password</h2>
          </div>
          <div class="modal-body">
            <form method="POST">
              <div>
                <div class="form-title">Username</div>
                <div class="form-content">
                  <input
                    type="text"
                    id="forgot-password-username"
                    placeholder="Username or email"
                  />
                </div>
              </div>
              <div class="form-footer">
                <span class="modal-form-error"></span>
                <span class="form-submit">
                  <input type="submit" value="Reset" />
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="password-reset-email-modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Password reset email sent</h2>
          </div>
          <div class="modal-body">
            <p>
              We've sent you an email with instructions on how to reset
              your password. Note that the email will expire in a day.
            </p>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="login-to-create-squad-modal-overlay">
        <div class="modal" id="login-to-create-squad-modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Log in or register</h2>
          </div>
          <div class="modal-body">
            <p>
              In order to create a new squad, you'll first need to
              <a href="#" class="show-login-modal">log in</a> or
              <a href="#" class="show-register-modal">register</a>
              a new account.
            </p>
          </div>
        </div>
      </div>

HTML;
} else {
  echo <<<HTML
      <div class="modal-overlay" id="user-settings-modal-overlay">
        <div class="modal large-modal" id="user-settings-modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Edit account</h2>
          </div>
          <div class="modal-body">
            <form method="POST">
              <div class="form-text">
                <div class="form-title">Username</div>
                <div class="form-content">$username</div>
              </div>
              <div>
                <div class="form-title">Email</div>
                <div class="form-content">
                  <input
                    type="text"
                    id="change-email"
                    placeholder="Email"
                    value="$email"
                  />

HTML;
  if ($email_verified) {
    echo <<<HTML
                  <div
                    class="form-subtitle verified-status-true"
                    id="email-verified-status"
                  >
                    Verified
                  </div>

HTML;
  } else {
    echo <<<HTML
                  <div class="form-subtitle" id="email-verified-status">
                    <span class="verified-status-false">
                      Not verified
                    </span>
                    -
                    <a href="#" id="resend-verification-email-button">
                      resend verification email
                    </a>
                  </div>

HTML;
  }
  echo <<<HTML
                </div>
              </div>
              <div>
                <div class="form-title">New password (optional)</div>
                <div class="form-content">
                  <div>
                    <input
                      type="password"
                      id="change-new-password"
                      placeholder="New password (optional)"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      id="change-confirm-password"
                      placeholder="Confirm new password (optional)"
                    />
                  </div>
                </div>
              </div>
              <div>
                <div class="form-title">Current password</div>
                <div class="form-content">
                  <input
                    type="password"
                    id="change-old-password"
                    placeholder="Current password"
                  />
                </div>
              </div>
              <div class="form-footer">
                <span class="modal-form-error"></span>
                <span class="form-submit">
                  <input type="submit" value="Update account" />
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
                  <div class="form-enum-container">
                    <input
                      type="radio"
                      name="new-squad-type"
                      id="new-squad-open"
                      value="open"
                    />
                    <div class="form-enum-option">
                      <label for="new-squad-open">
                        Open
                        <span class="form-enum-description">
                          Anybody can view the contents of an open squad.
                        </span>
                      </label>
                    </div>
                  </div>
                  <div class="form-enum-container">
                    <input
                      type="radio"
                      name="new-squad-type"
                      id="new-squad-closed"
                      value="closed"
                    />
                    <div class="form-enum-option">
                      <label for="new-squad-closed">
                        Closed
                        <span class="form-enum-description">
                          Only people with the password can view the contents of
                          a closed squad.
                        </span>
                      </label>
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
                  </div>
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
                    value="{$squads[$squad]}"
                  />
                </div>
              </div>
              <div class="modal-radio-selector">
                <div class="form-title">Privacy</div>
                <div class="form-enum-selector">
                  <div class="form-enum-container">
                    <input
                      type="radio"
                      name="edit-squad-type"
                      id="edit-squad-open"
                      value="open"

HTML;
  if (!$squad_requires_auth) {
    echo <<<HTML
                      checked

HTML;
  }
  echo <<<HTML
                    />
                    <div class="form-enum-option">
                      <label for="edit-squad-open">
                        Open
                        <span class="form-enum-description">
                          Anybody can view the contents of an open squad.
                        </span>
                      </label>
                    </div>
                  </div>
                  <div class="form-enum-container">
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
                      <label for="edit-squad-closed">
                        Closed
                        <span class="form-enum-description">
                          Only people with the password can view the contents of
                          a closed squad.
                        </span>
                      </label>
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
                  </div>
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
  $extra_class = $show === 'verify_email' ? ' visible-modal-overlay' : '';
  echo <<<HTML
      <div class="modal-overlay$extra_class" id="verify-email-modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Verify email</h2>
          </div>
          <div class="modal-body">
            <p>
              We've sent you an email to verify your email address. Just click
              on the link in the email to complete the verification process.
            </p>
            <p>
              Note that the email will expire in a day, but another
              email can be sent from "Edit account" in the user menu at any
              time.
            </p>
          </div>
        </div>
      </div>

HTML;
}
if ($show === 'verified_email') {
  echo <<<HTML
      <div class="modal-overlay visible-modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>Verified email</h2>
          </div>
          <div class="modal-body">
            <p>
              Thanks for verifying your email address!
            </p>
          </div>
        </div>
      </div>

HTML;
} else if ($show === 'reset_password') {
  $result = $conn->query(
    "SELECT username FROM users WHERE id = $verified_user"
  );
  $reset_password_user_row = $result->fetch_assoc();
  $reset_password_username = $reset_password_user_row['username'];
  echo <<<HTML
      <div class="modal-overlay visible-modal-overlay">
        <div class="modal" id="reset-password-modal">
          <div class="modal-header">
            <h2>Reset password</h2>
          </div>
          <div class="modal-body">
            <form method="POST">
              <div class="form-text">
                <div class="form-title">Username</div>
                <div class="form-content">$reset_password_username</div>
              </div>
              <div>
                <div class="form-title">Password</div>
                <div class="form-content">
                  <div>
                    <input
                      type="password"
                      id="reset-new-password"
                      placeholder="Password"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      id="reset-confirm-password"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>
              </div>
              <input
                type="hidden"
                id="reset-password-code"
                value="{$query_string['verify']}"
              />
              <div class="form-footer">
                <span class="modal-form-error"></span>
                <span class="form-submit">
                  <input type="submit" value="Update" />
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>

HTML;
}
?>
      <script src="script.js"></script>
    </body>
</html>
