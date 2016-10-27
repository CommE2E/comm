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

function background_color_is_dark($color) {
  $red = hexdec(substr($color, 0, 2));
  $green = hexdec(substr($color, 2, 2));
  $blue = hexdec(substr($color, 4, 2));
  return $red * 0.299 + $green * 0.587 + $blue * 0.114 < 187;
}

$result = $conn->query(
  "SELECT s.id, s.name, r.role, s.hash IS NOT NULL AS requires_auth, ".
    "r.squad IS NOT NULL AND r.role >= ".ROLE_SUCCESSFUL_AUTH." ".
    "AS is_authed, r.subscribed, s.color FROM squads s LEFT JOIN roles r ".
    "ON r.squad = s.id AND r.user = {$viewer_id}"
);
$all_squad_names = array();
$squad_names = array();
$colors = array();
$color_is_dark = array();
$authorized_squads = array();
$viewer_can_edit_squad = false;
$viewer_subscribed = false;
$squad_requires_auth = false;
$subscription_exists = false;
while ($row = $result->fetch_assoc()) {
  $all_squad_names[$row['id']] = $row['name'];
  $authorized_squads[$row['id']] = $row['is_authed'] || !$row['requires_auth'];
  $subscribed_authorized = $authorized_squads[$row['id']] && $row['subscribed'];
  if ($subscribed_authorized) {
    $subscription_exists = true;
  }
  if ($subscribed_authorized || (int)$row['id'] === $squad) {
    $colors[$row['id']] = $row['color'];
    $color_is_dark[$row['id']] = background_color_is_dark($row['color']);
    $squad_names[$row['id']] = $row['name'];
  }
  if ((int)$row['id'] === $squad) {
    $viewer_can_edit_squad = (int)$row['role'] >= ROLE_CREATOR;
    $viewer_subscribed = (bool)$row['subscribed'];
    $squad_requires_auth = (bool)$row['requires_auth'];
  }
}
if (!isset($_GET['squad']) && $subscription_exists) {
  // If we defaulted to squad 254 but a subscription exists, default to home
  $home = true;
  $squad = null;
  $viewer_can_edit_squad = false;
  $viewer_subscribed = false;
  $squad_requires_auth = false;
}
if (
  ($home && !$subscription_exists) ||
  (!$home && (!isset($squad_names[$squad]) || !$authorized_squads[$squad]))
) {
  header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
  exit;
}
$current_nav_name = $home ? "Home" : $squad_names[$squad];

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
$text = array_fill(1, $days_in_month, array());
$creation_times = array();
$entry_squads = array();
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
  if (!$authorized_squads[$entry_squad]) {
    continue;
  }
  $day = intval($row['day']);
  $entry = intval($row['entry_id']);
  $text[$day][$entry] = $row['text'];
  $creation_times[$entry] = intval($row['creation_time']);
  $entry_squads[$entry] = $entry_squad;
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
        var squad = <?=($squad === null ? "null" : $squad)?>;
        var email = "<?=$email?>";
        var squad_name = "<?=(isset($squad_names[$squad]) ? $squad_names[$squad] : '')?>";
        var squad_names = <?=json_encode($squad_names)?>;
        var all_squad_names = <?=json_encode($all_squad_names)?>;
        var month = <?=$month?>;
        var year = <?=$year?>;
        var authorized_squads = <?=json_encode($authorized_squads)?>;
        var month_url = "<?=$month_url?>";
        var this_url = "<?=$this_url?>";
        var squad_requires_auth = <?=($squad_requires_auth ? 'true' : 'false')?>;
        var viewer_subscribed = <?=($viewer_subscribed ? 'true' : 'false')?>;
        var show = "<?=$show?>";
        var base_url = "<?=$base_url?>";
        var creation_times = <?=json_encode($creation_times)?>;
        var colors = <?=json_encode($colors)?>;
        var color_is_dark = <?=json_encode($color_is_dark)?>;
        var original_nav = "<?=($home ? 'home' : $squad)?>";
        var current_nav_name = "<?=$current_nav_name?>";
        var subscription_exists = <?=($subscription_exists ? 'true' : 'false')?>;
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
        <div class="upper-right">

HTML;
if (!$home) {
  $subscribe_button_text = $viewer_subscribed ? "Unsubscribe" : "Subscribe";
  echo <<<HTML
          <div class="nav-button">
            <img
              id="squad"
              src="{$base_url}images/squad.svg"
              alt="squad settings"
            />
            <div class="nav-menu">
              <div>
                <img
                  class="subscribe-loading"
                  src="{$base_url}images/ajax-loader.gif"
                  alt="loading"
                />
                <a href="#" id="subscribe-button">{$subscribe_button_text}</a>
              </div>

HTML;
  if ($viewer_can_edit_squad) {
    echo <<<HTML
              <div><a href="#" id="edit-squad-button">
                  Edit squad
              </a></div>
              <div><a href="#" id="delete-squad-button">Delete squad</a></div>

HTML;
  }
  echo <<<HTML
            </div>
          </div>

HTML;
}
echo <<<HTML
          <div id="squad-nav-parent">
          </div>
        </div>
        <div class="lower-left">
          <div class="nav-button">

HTML;
if (user_logged_in()) {
  echo <<<HTML
            logged in as
            <span id="username">$username</span>
            <div class="nav-menu">
              <div><a href="#" id="log-out-button">Log out</a></div>
              <div><a href="#" id="user-settings-button">Edit account</a></div>
              <div>
                <a href="#" id="delete-account-button">Delete account</a>
              </div>
            </div>

HTML;
} else {
  echo <<<HTML
            <a href="#" id="log-in-button">Log in</a> ·
            <a href="#" id="register-button">Register</a>

HTML;
}
echo <<<HTML
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

$tab_index = 1;
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
  echo <<<HTML
          <td class='day' id='{$current_date}'>
            <h2>$current_date</h2>
            <div class='entry-container'>

HTML;
  foreach ($text[$current_date] as $entry_id => $entry_text) {
    $entry_squad = $entry_squads[$entry_id];
    $style = 'background-color: #'.$colors[$entry_squad];
    $possibly_dark_background = $color_is_dark[$entry_squad] ? ' dark-entry' : '';
    $truncated_squad_name = strlen($squad_names[$entry_squad]) > 12
      ? substr($squad_names[$entry_squad], 0, 11) . "..."
      : $squad_names[$entry_squad];
    echo <<<HTML
              <div class='entry{$possibly_dark_background}' style='{$style}'>
                <textarea
                  rows='1'
                  id='{$current_date}_{$entry_id}'
                  tabindex='{$tab_index}'
                >{$entry_text}</textarea>
                <img
                  class="entry-loading"
                  src="{$base_url}images/ajax-loader.gif"
                  alt="loading"
                />
                <span class="save-error">!</span>
                <div class='action-links'>
                  <a href='#' class='delete-entry-button'>
                    <span class='delete'>✖</span>
                    <span class='action-links-text'>Delete</span>
                  </a>
                  <a href='#' class='entry-history-button'>
                    <span class='history'>≡</span>
                    <span class='action-links-text'>History</span>
                  </a>
                  <span class='right-action-links action-links-text'>
                    {$truncated_squad_name}
                  </span>
                  <div class='clear'></div>
                </div>
              </div>

HTML;
    $tab_index++;
  }
  echo <<<HTML
              <div class="entry-container-spacer"></div>
            </div>
            <div class='action-links day-action-links'>
              <a href='#' class='add-entry-button'>
                <span class='add'>+</span>
                <span class='action-links-text'>Add</span>
              </a>
              <a href='#' class='day-history-button'>
                <span class='history'>≡</span>
                <span class='action-links-text'>History</span>
              </a>
            </div>

HTML;
  if ($home) {
    echo <<<HTML
            <div class='pick-squad'>

HTML;
    foreach ($squad_names as $new_entry_squad => $new_entry_squad_name) {
      $truncated_squad_name = strlen($new_entry_squad_name) > 20
        ? substr($new_entry_squad_name, 0, 19) . "..."
        : $new_entry_squad_name;
      $style = 'background-color: #'.$colors[$new_entry_squad];
      echo <<<HTML
              <div>
                <a href='#' class='select-squad' id='select_{$new_entry_squad}'>
                  <div class='color-preview' style='{$style}'></div>
                  {$truncated_squad_name}
                </a>
              </div>

HTML;
    }
    echo <<<HTML
            </div>

HTML;
  }
  echo <<<HTML
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
      <div class="modal-overlay" id="history-modal-overlay">
        <div class="modal" id="history-modal">
          <div class="modal-header">
            <span class="modal-close">×</span>
            <h2>History</h2>
          </div>
          <div class="modal-body">
            <div class="history-header">
              <a id='all-history-button' href='#'>&lt; all entries</a>
              <span class="history-date"></span>
            </div>
            <p id="history-loading">
              <img
                src="{$base_url}images/ajax-loader.gif"
                alt="loading"
              />
            </p>
            <div class="day-history"><ul></ul></div>
            <div class="entry-history"><ul></ul></div>
          </div>
        </div>
      </div>
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

HTML;
if (!user_logged_in()) {
  echo <<<HTML
              <p class="form-pre-footer">
                Or <a href="#" class="show-login-modal">log in</a>
                to your account if you already have access
              </p>

HTML;
}
echo <<<HTML
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

HTML;
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
              <div>
                <div class="form-title" id="color-title">Color</div>
                <div class="form-content">
                  <input type="text" id="new-squad-color" />
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

HTML;
  if (!$home && $viewer_can_edit_squad) {
    echo <<<HTML
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
                    value="{$squad_names[$squad]}"
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
                <div class="form-title" id="color-title">Color</div>
                <div class="form-content">
                  <input type="text" id="edit-squad-color" />
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
