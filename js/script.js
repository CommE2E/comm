// Polyfill everything so even ES3 browsers work
import 'babel-polyfill';

// jQuery and plugins
import $ from 'jquery';
import 'timeago'; // side effect: $.timeago
import 'jquery-dateformat'; // side effect: $.format
import 'spectrum-colorpicker'; // side effect: $.spectrum

// Modernizr (custom, so it's not a JSPM package)
import './modernizr-custom';

// React
import React from 'react';
import ReactDOM from 'react-dom';
import Typeahead from './typeahead/typeahead.react'
import ModalManager from './modals/modal-manager.react'
import Calendar from './calendar/calendar.react'

var session_id = Math.floor(0x80000000 * Math.random()).toString(36);

var new_squad = null;
function open_squad_auth_modal(squadInfo: SquadInfo) {
  $('div#squad-login-name > div.form-content').text(squadInfo.name);
  new_squad = squadInfo.id;
  $('div#squad-login-modal-overlay').show();
  $('div#squad-login-modal input:visible')
    .filter(function() { return this.value === ""; })
    .first()
    .focus();
}

let modalManager = null;
ReactDOM.render(
  <ModalManager ref={(mm) => modalManager = mm} />,
  document.getElementById('modal-manager-parent'),
);

let typeahead = null;
ReactDOM.render(
  <Typeahead
    thisURL={this_url}
    baseURL={base_url}
    monthURL={month_url}
    currentNavID={original_nav}
    currentNavName={current_nav_name}
    squadInfos={squad_infos}
    loggedIn={!!email}
    openSquadAuthModal={open_squad_auth_modal}
    setModal={modalManager.setModal.bind(modalManager)}
    clearModal={modalManager.clearModal.bind(modalManager)}
    ref={(ta) => typeahead = ta}
  />,
  document.getElementById('squad-nav-parent'),
);

ReactDOM.render(
  <Calendar
    baseURL={base_url}
    sessionID={session_id}
    year={year}
    month={month}
    entryInfos={entry_infos}
    squadInfos={squad_infos}
  />,
  document.getElementById('calendar'),
);

if (show === 'reset_password') {
  $('input#reset-new-password').focus();
} else {
  // No way to escape the reset password prompt
  $(window).click(function(event) {
    if ($(event.target).hasClass('modal-overlay')) {
      $('div.modal-overlay').hide();
    }
  });
  $('span.modal-close').click(function() {
    $('div.modal-overlay').hide();
  });
  $(document).keyup(function(e) {
    if (e.keyCode == 27) { // esc key
      $('div.modal-overlay').hide();
    }
  });
}

$('input#refresh-button').click(function() {
  window.location.href = this_url;
});

$('div#squad-login-modal span.modal-close').click(function() {
  typeahead.unfreeze();
  $('input#squad-password').val("");
  $('div#squad-login-modal span.modal-form-error').text("");
});
$(window).click(function(event) {
  if (event.target.id === 'squad-login-modal-overlay') {
    typeahead.unfreeze();
    $('input#squad-password').val("");
    $('div#squad-login-modal span.modal-form-error').text("");
  }
});
$(document).keyup(function(e) {
  if (e.keyCode == 27) { // esc key
    typeahead.unfreeze();
    $('input#squad-password').val("");
    $('div#squad-login-modal span.modal-form-error').text("");
  }
});
$('div#squad-login-modal form').submit(function(event) {
  event.preventDefault();
  $('div#squad-login-modal input').prop("disabled", true);
  $.post(
    'auth_squad.php',
    {
      'squad': new_squad,
      'password': $('input#squad-password').val(),
    },
    function(data) {
      console.log(data);
      if (data.success === true) {
        window.location.href = month_url+"&squad="+new_squad;
        return;
      }
      $('input#squad-password').val("");
      $('input#squad-password').focus();
      $('div#squad-login-modal input').prop("disabled", false);
      if (data.error === 'invalid_credentials') {
        $('div#squad-login-modal span.modal-form-error')
          .text("wrong password");
      } else {
        $('div#squad-login-modal span.modal-form-error')
          .text("unknown error");
      }
    }
  );
});

$('a#log-in-button').click(function() {
  $('div#log-in-modal-overlay').show();
  $('div#log-in-modal input:visible')
    .filter(function() { return this.value === ""; })
    .first()
    .focus();
});
$('div#log-in-modal span.modal-close').click(function() {
  $('input#log-in-password').val("");
  $('div#log-in-modal span.modal-form-error').text("");
});
$(window).click(function(event) {
  if (event.target.id === 'log-in-modal-overlay') {
    $('input#log-in-password').val("");
    $('div#log-in-modal span.modal-form-error').text("");
  }
});
$(document).keyup(function(e) {
  if (e.keyCode == 27) { // esc key
    $('input#log-in-password').val("");
    $('div#log-in-modal span.modal-form-error').text("");
  }
});
$('div#log-in-modal form').submit(function(event) {
  event.preventDefault();
  var username = $('input#log-in-username').val();
  var valid_username_regex = /^[a-zA-Z0-9-_]+$/;
  var valid_email_regex = new RegExp(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source +
    /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source +
    /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source
  );
  if (
    username.search(valid_username_regex) === -1 &&
    username.search(valid_email_regex) === -1
  ) {
    $('input#log-in-username').val("");
    $('input#log-in-username').focus();
    $('div#log-in-modal span.modal-form-error')
      .text("alphanumeric usernames or emails only");
    return;
  }
  $('div#log-in-modal input').prop("disabled", true);
  $.post(
    'login.php',
    {
      'username': username,
      'password': $('input#log-in-password').val(),
    },
    function(data) {
      console.log(data);
      if (data.success === true) {
        window.location.href = this_url;
        return;
      }
      $('div#log-in-modal input').prop("disabled", false);
      if (data.error === 'invalid_parameters') {
        $('input#log-in-username').val("");
        $('input#log-in-username').focus();
        $('div#log-in-modal span.modal-form-error')
          .text("user doesn't exist");
      } else if (data.error === 'invalid_credentials') {
        $('input#log-in-password').val("");
        $('input#log-in-password').focus();
        $('div#log-in-modal span.modal-form-error')
          .text("wrong password");
      } else {
        $('input#log-in-username').val("");
        $('input#log-in-password').val("");
        $('input#log-in-username').val("");
        $('input#log-in-username').focus();
        $('div#log-in-modal span.modal-form-error')
          .text("unknown error");
      }
    }
  );
});

$('a#register-button').click(function() {
  $('div#register-modal-overlay').show();
  $('div#register-modal input:visible')
    .filter(function() { return this.value === ""; })
    .first()
    .focus();
});
$('div#register-modal span.modal-close').click(function() {
  $('input#register-password').val("");
  $('input#register-confirm-password').val("");
  $('div#register-modal span.modal-form-error').text("");
});
$(window).click(function(event) {
  if (event.target.id === 'register-modal-overlay') {
    $('input#register-password').val("");
    $('input#register-confirm-password').val("");
    $('div#register-modal span.modal-form-error').text("");
  }
});
$(document).keyup(function(e) {
  if (e.keyCode == 27) { // esc key
    $('input#register-password').val("");
    $('input#register-confirm-password').val("");
    $('div#register-modal span.modal-form-error').text("");
  }
});
$('div#register-modal form').submit(function(event) {
  event.preventDefault();
  var password = $('input#register-password').val();
  if (password.trim() === '') {
    $('input#register-password').val("");
    $('input#register-confirm-password').val("");
    $('input#register-password').focus();
    $('div#register-modal span.modal-form-error')
      .text("empty password");
    return;
  }
  var confirm_password = $('input#register-confirm-password').val();
  if (password !== confirm_password) {
    $('input#register-password').val("");
    $('input#register-confirm-password').val("");
    $('input#register-password').focus();
    $('div#register-modal span.modal-form-error')
      .text("passwords don't match");
    return;
  }
  var username = $('input#register-username').val();
  var valid_username_regex = /^[a-zA-Z0-9-_]+$/;
  if (username.search(valid_username_regex) === -1) {
    $('input#register-username').val("");
    $('input#register-username').focus();
    $('div#register-modal span.modal-form-error')
      .text("alphanumeric usernames only");
    return;
  }
  var email_field = $('input#register-email').val();
  var valid_email_regex = new RegExp(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source +
    /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source +
    /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source
  );
  if (email_field.search(valid_email_regex) === -1) {
    $('input#register-email').val("");
    $('input#register-email').focus();
    $('div#register-modal span.modal-form-error')
      .text("invalid email address");
    return;
  }
  $('div#register-modal input').prop("disabled", true);
  $.post(
    'register.php',
    {
      'username': username,
      'email': email_field,
      'password': password,
    },
    function(data) {
      console.log(data);
      if (data.success === true) {
        window.location.href = this_url+"&show=verify_email";
        return;
      }
      $('div#register-modal input').prop("disabled", false);
      if (data.error === 'username_taken') {
        $('input#register-username').val("");
        $('input#register-username').focus();
        $('div#register-modal span.modal-form-error')
          .text("username already taken");
      } else if (data.error === 'email_taken') {
        $('input#register-email').val("");
        $('input#register-email').focus();
        $('div#register-modal span.modal-form-error')
          .text("email already taken");
      } else {
        $('input#register-username').val("");
        $('input#register-email').val("");
        $('input#register-password').val("");
        $('input#register-confirm-password').val("");
        $('input#register-username').focus();
        $('div#register-modal span.modal-form-error')
          .text("unknown error");
      }
    }
  );
});

$('a#forgot-password-button').click(function() {
  $('div#log-in-modal-overlay').hide();
  $('input#log-in-password').val("");
  $('div#log-in-modal span.modal-form-error').text("");
  $('div#forgot-password-modal-overlay').show();
  $('input#forgot-password-username').focus();
});
$('div#log-in-modal span.modal-close').click(function() {
  $('div#forgot-password-modal span.modal-form-error').text("");
});
$(window).click(function(event) {
  if (event.target.id === 'log-in-modal-overlay') {
    $('div#forgot-password-modal span.modal-form-error').text("");
  }
});
$(document).keyup(function(e) {
  if (e.keyCode == 27) { // esc key
    $('div#forgot-password-modal span.modal-form-error').text("");
  }
});
$('div#forgot-password-modal form').submit(function(event) {
  event.preventDefault();
  var username = $('input#forgot-password-username').val();
  var valid_username_regex = /^[a-zA-Z0-9-_]+$/;
  var valid_email_regex = new RegExp(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source +
    /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source +
    /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source
  );
  if (
    username.search(valid_username_regex) === -1 &&
    username.search(valid_email_regex) === -1
  ) {
    $('input#forgot-password-username').val("");
    $('input#forgot-password-username').focus();
    $('div#forgot-password-modal span.modal-form-error')
      .text("alphanumeric usernames or emails only");
    return;
  }
  $('div#forgot-password-modal input').prop("disabled", true);
  $.post(
    'forgot_password.php',
    {
      'username': username,
    },
    function(data) {
      console.log(data);
      $('div#forgot-password-modal input').prop("disabled", false);
      $('input#forgot-password-username').val("");
      if (data.success === true) {
        $('div#forgot-password-modal-overlay').hide();
        $('div#forgot-password-modal span.modal-form-error').text("");
        $('div#password-reset-email-modal-overlay').show();
      } else if (data.error === 'invalid_user') {
        $('input#forgot-password-username').focus();
        $('div#forgot-password-modal span.modal-form-error')
          .text("user doesn't exist");
      } else {
        $('input#forgot-password-username').focus();
        $('div#forgot-password-modal span.modal-form-error')
          .text("unknown error");
      }
    }
  );
});
$('div#reset-password-modal form').submit(function(event) {
  event.preventDefault();
  var password = $('input#reset-new-password').val();
  if (password.trim() === '') {
    $('input#reset-new-password').val("");
    $('input#reset-confirm-password').val("");
    $('input#reset-new-password').focus();
    $('div#reset-password-modal span.modal-form-error')
      .text("empty password");
    return;
  }
  var confirm_password = $('input#reset-confirm-password').val();
  if (password !== confirm_password) {
    $('input#reset-new-password').val("");
    $('input#reset-confirm-password').val("");
    $('input#reset-new-password').focus();
    $('div#reset-password-modal span.modal-form-error')
      .text("passwords don't match");
    return;
  }
  $('div#reset-password-modal input').prop("disabled", true);
  $.post(
    'reset_password.php',
    {
      'code': $('input#reset-password-code').val(),
      'password': password,
    },
    function(data) {
      console.log(data);
      if (data.success === true) {
        window.location.href = this_url;
        return;
      }
      $('div#reset-password-modal input').prop("disabled", false);
      $('input#reset-new-password').val("");
      $('input#reset-confirm-password').val("");
      $('input#reset-new-password').focus();
      $('div#reset-password-modal span.modal-form-error')
        .text("unknown error");
    }
  );
});

$('a#log-out-button').click(function() {
  $.post(
    'logout.php',
    {},
    function(data) {
      window.location.href = month_url;
    }
  );
});

$('a#user-settings-button').click(function() {
  $('div#user-settings-modal-overlay').show();
  $('input#change-email').focus();
});
$('div#user-settings-modal span.modal-close').click(function() {
  $('input#change-current-password').val("");
  $('input#change-new-password').val("");
  $('input#change-confirm-password').val("");
  $('div#user-settings-modal span.modal-form-error').text("");
});
$(window).click(function(event) {
  if (event.target.id === 'user-settings-modal-overlay') {
    $('input#change-current-password').val("");
    $('input#change-new-password').val("");
    $('input#change-confirm-password').val("");
    $('div#user-settings-modal span.modal-form-error').text("");
  }
});
$(document).keyup(function(e) {
  if (e.keyCode == 27) { // esc key
    $('input#change-current-password').val("");
    $('input#change-new-password').val("");
    $('input#change-confirm-password').val("");
    $('div#user-settings-modal span.modal-form-error').text("");
  }
});
$('div#user-settings-modal form').submit(function(event) {
  event.preventDefault();
  var new_password = $('input#change-new-password').val();
  var confirm_password = $('input#change-confirm-password').val();
  if (new_password !== confirm_password) {
    $('input#change-new-password').val("");
    $('input#change-confirm-password').val("");
    $('input#change-new-password').focus();
    $('div#user-settings-modal span.modal-form-error')
      .text("passwords don't match");
    return;
  }
  var email_field = $('input#change-email').val();
  var valid_email_regex = new RegExp(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source +
    /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source +
    /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source
  );
  if (email_field.search(valid_email_regex) === -1) {
    $('input#change-email').val(email);
    $('div#email-verified-status').show();
    $('input#change-email').focus();
    $('div#user-settings-modal span.modal-form-error')
      .text("invalid email address");
    return;
  }
  $('div#user-settings-modal input').prop("disabled", true);
  $.post(
    'edit_account.php',
    {
      'email': email_field,
      'new_password': new_password,
      'old_password': $('input#change-old-password').val(),
    },
    function(data) {
      console.log(data);
      if (data.success === true) {
        if (email_field !== email) {
          window.location.href = this_url+"&show=verify_email";
        } else {
          window.location.href = this_url;
        }
        return;
      }
      $('div#user-settings-modal input').prop("disabled", false);
      if (data.error === 'invalid_credentials') {
        $('input#change-old-password').val("");
        $('input#change-old-password').focus();
        $('div#user-settings-modal span.modal-form-error')
          .text("wrong current password");
      } else if (data.error === 'email_taken') {
        $('input#change-email').val(email);
        $('div#email-verified-status').show();
        $('input#change-email').focus();
        $('div#user-settings-modal span.modal-form-error')
          .text("email already taken");
      } else {
        $('input#change-old-password').val("");
        $('input#change-email').val(email);
        $('div#email-verified-status').show();
        $('input#change-new-password').val("");
        $('input#change-confirm-password').val("");
        $('input#change-email').focus();
        $('div#user-settings-modal span.modal-form-error')
          .text("unknown error");
      }
    }
  );
});
$('input#change-email').on("input propertychange", function() {
  var email_field = $('input#change-email').val();
  if (email_field != email) {
    $('div#email-verified-status').hide();
  } else {
    $('div#email-verified-status').show();
  }
});
$('a#resend-verification-email-button').click(function() {
  // Close user settings modal
  $('input#change-current-password').val("");
  $('input#change-new-password').val("");
  $('input#change-confirm-password').val("");
  $('div#user-settings-modal span.modal-form-error').text("");
  $('div#user-settings-modal-overlay').hide();
  // Actually resend the email
  $.post('resend_verification.php', {});
  // Show verification modal
  $('div#verify-email-modal-overlay').show();
});

$('a#delete-account-button').click(function() {
  $('div#delete-account-modal-overlay').show();
  $('div#delete-account-modal input:visible')
    .filter(function() { return this.value === ""; })
    .first()
    .focus();
});
$('div#delete-account-modal span.modal-close').click(function() {
  $('input#delete-account-password').val("");
  $('div#delete-account-modal span.modal-form-error').text("");
});
$(window).click(function(event) {
  if (event.target.id === 'delete-account-modal-overlay') {
    $('input#delete-account-password').val("");
    $('div#delete-account-modal span.modal-form-error').text("");
  }
});
$(document).keyup(function(e) {
  if (e.keyCode == 27) { // esc key
    $('input#delete-account-password').val("");
    $('div#delete-account-modal span.modal-form-error').text("");
  }
});
$('div#delete-account-modal form').submit(function(event) {
  event.preventDefault();
  $('div#delete-account-modal input').prop("disabled", true);
  $.post(
    'delete_account.php',
    {
      'password': $('input#delete-account-password').val(),
    },
    function(data) {
      console.log(data);
      if (data.success === true) {
        window.location.href = month_url;
        return;
      }
      $('div#delete-account-modal input').prop("disabled", false);
      $('input#delete-account-password').val("");
      $('input#delete-account-password').focus();
      if (data.error === 'invalid_credentials') {
        $('div#delete-account-modal span.modal-form-error')
          .text("wrong password");
      } else {
        $('div#delete-account-modal span.modal-form-error')
          .text("unknown error");
      }
    }
  );
});

$('a.show-login-modal').click(function() {
  typeahead.unfreeze();
  $('div.modal-overlay').hide();
  $('div#log-in-modal-overlay').show();
  $('div#log-in-modal input:visible')
    .filter(function() { return this.value === ""; })
    .first()
    .focus();
});
$('a.show-register-modal').click(function() {
  $('div.modal-overlay').hide();
  $('div#register-modal-overlay').show();
  $('div#register-modal input:visible')
    .filter(function() { return this.value === ""; })
    .first()
    .focus();
});

function truncated_squad_name(squad, max_length) {
  var raw_squad_name = squad_names[squad];
  if (raw_squad_name.length <= max_length) {
    return raw_squad_name;
  }
  return raw_squad_name.substring(0, max_length - 1) + "...";
}
var history_numeric_date = null;
var day_history_loaded = false;
var entry_history_loaded = null;
// mode = 0: day view
// mode = 1: entry view
function update_history_modal_mode(mode, animate) {
  $('div#history-modal-overlay').show();
  if (mode === 0) {
    if (animate) {
      $('div.day-history').animate({
        left: '0',
      }, 500);
      $('div.entry-history').animate({
        left: '100%',
      }, 500);
    } else {
      $('div.day-history').css('left', '0');
      $('div.entry-history').css('left', '100%');
    }
    $('a#all-history-button').css('visibility', 'hidden');
  } else if (mode === 1) {
    if (animate) {
      $('div.day-history').animate({
        left: '-100%',
      }, 500);
      $('div.entry-history').animate({
        left: '0',
      }, 500);
    } else {
      $('div.day-history').css('left', '-100%');
      $('div.entry-history').css('left', '0');
    }
    $('a#all-history-button').css('visibility', 'visible');
  }
}
function show_entry_history(id, animate) {
  $('p#history-loading').show();
  $('div.entry-history > ul').empty();
  $('span.history-date').text(pretty_date(history_numeric_date));
  update_history_modal_mode(1, animate);
  $.post(
    'entry_history.php',
    { 'id': id },
    function(data) {
      console.log(data);
      $('p#history-loading').hide();
      var list = $('div.entry-history > ul');
      for (var i in data.result) {
        var revision = data.result[i];
        var next_revision = data.result[parseInt(i) + 1];
        var list_item = $('<li>').appendTo(list);
        if (
          next_revision !== undefined &&
          revision.deleted !== next_revision.deleted
        ) {
          list_item.append(
            revision.deleted
              ? "<div class='entry-history-deleted'>Deleted</div>"
              : "<div class='entry-history-restored'>Restored</div>"
          );
        } else {
          var entry_div = $(
            "<div class='entry entry-history-entry'>" +
              revision.text + "</div>"
          ).appendTo(list_item);
          entry_div.css('background-color', '#' + colors[revision.squad]);
          if (color_is_dark[revision.squad]) {
            entry_div.addClass('dark-entry');
          }
        }
        var author = revision.author === null
          ? "Anonymous"
          : "<span class='entry-username'>" + revision.author + "</span>";
        list_item.append(
          "<span class='entry-author'>updated by " + author + "</span>"
        );
        var date = new Date(revision.last_update);
        var hovertext =
          $.format.toBrowserTimeZone(date, "ddd, MMMM D, yyyy 'at' h:mm a");
        var time = $(
          "<time class='timeago entry-time' datetime='" + date.toISOString() +
            "'>" + hovertext + "</time>"
        ).appendTo(list_item);
        time.timeago();
        list_item.append("<div class='clear'>");
      }
      entry_history_loaded = id;
    }
  );
}
function show_day_history(numeric_date, animate) {
  $('p#history-loading').show();
  $('div.day-history > ul').empty();
  $('span.history-date').text(pretty_date(history_numeric_date));
  update_history_modal_mode(0, animate);
  $.post(
    'day_history.php',
    {
      'day': numeric_date,
      'month': month,
      'year': year,
      'nav': original_nav,
    },
    function(data) {
      console.log(data);
      $('p#history-loading').hide();
      var list = $('div.day-history > ul');
      for (var i in data.result) {
        var entry = data.result[i];
        var list_item = $("<li id='history_" + entry.id + "'>").appendTo(list);
        var entry_div = $(
          "<div class='entry entry-history-entry'>" +
            entry.text + "</div>"
        ).appendTo(list_item);
        entry_div.css('background-color', '#' + colors[entry.squad]);
        if (color_is_dark[entry.squad]) {
          entry_div.addClass('dark-entry');
        }
        var creator = entry.creator === null
          ? "Anonymous"
          : "<span class='entry-username'>" + entry.creator + "</span>";
        list_item.append(
          "<span class='entry-author'>created by " + creator + "</span>"
        );
        list_item.append(
          "<span class='entry-squad'>" +
            truncated_squad_name(entry.squad, 20) +
          "</span>"
        );
        list_item.append("<div class='clear'>");
        var deleted = entry.deleted
          ? "<span class='deleted-entry'>" +
              "<span class='deleted-entry-label'>deleted</span>" +
              "<span class='restore-entry-label'>" +
              "(<a href='#' class='restore-entry-button'>restore</a>)</span>" +
              "<img class='restore-loading' src='" + base_url +
              "images/ajax-loader.gif' alt='loading' /></span>"
          : "";
        list_item.append(deleted);
        list_item.append(
          "<a href='#' class='revision-history-button'>" +
            "revision history &gt;</a>"
        );
        list_item.append("<div class='clear'>");
      }
      day_history_loaded = true;
    }
  );
}
function pretty_date(numeric_date) {
  var month_and_date = $('h2.upper-center').text().replace(/[<>]/g, '').trim();
  var date = new Date(numeric_date + " " + month_and_date);
  return $.format.date(date, "MMMM D, yyyy");
}

$('div#history-modal span.modal-close').click(function() {
  history_numeric_date = null;
  day_history_loaded = false;
  entry_history_loaded = null;
});
$(window).click(function(event) {
  if (event.target.id === 'history-modal-overlay') {
    history_numeric_date = null;
    day_history_loaded = false;
    entry_history_loaded = null;
  }
});
$(document).keyup(function(e) {
  if (e.keyCode == 27) { // esc key
    history_numeric_date = null;
    day_history_loaded = false;
    entry_history_loaded = null;
  }
});

$('table').on('click', 'a.entry-history-button', function() {
  var entry = $(this).closest('div.entry');
  entry.removeClass('focused-entry');
  var id_parts = entry.find('textarea.entry-text').attr('id').split('_');
  if (history_numeric_date != id_parts[0]) {
    history_numeric_date = id_parts[0];
    day_history_loaded = false;
  }
  if (entry_history_loaded === id_parts[1]) {
    update_history_modal_mode(1, false);
  } else {
    show_entry_history(id_parts[1], false);
  }
});
$('div.day-history').on('click', 'a.revision-history-button', function() {
  var id_parts = $(this).closest('li').attr('id').split('_');
  if (entry_history_loaded === id_parts[1]) {
    update_history_modal_mode(1, true);
  } else {
    show_entry_history(id_parts[1], true);
  }
});
$('a.day-history-button').click(function() {
  var new_numeric_date = $(this).closest('td.day').attr('id');
  if (new_numeric_date === history_numeric_date && day_history_loaded) {
    update_history_modal_mode(0, false);
  } else {
    history_numeric_date = new_numeric_date;
    show_day_history(history_numeric_date, false);
  }
});
$('a#all-history-button').click(function() {
  if (!history_numeric_date) {
    return;
  }
  if (day_history_loaded) {
    update_history_modal_mode(0, true);
  } else {
    show_day_history(history_numeric_date, true);
  }
});

$('div.day-history').on('click', 'a.restore-entry-button', function() {
  var li = $(this).closest('li');
  var entry_id = li.attr('id').split('_')[1];
  var numeric_date = history_numeric_date;
  li.find('img.restore-loading').show();
  $.post(
    'restore_entry.php',
    {
      'id': entry_id,
      'session_id': session_id,
      'timestamp': Date.now(),
    },
    function(data) {
      console.log(data);
      if (!data.success) {
        return;
      }
      li.find('span.deleted-entry').remove();
      show_entry_history(entry_id, true);

      // Now we need to re-add the entry to the UI
      var new_entry = $("<div class='entry' />");
      new_entry.css('background-color', '#' + colors[data.squad]);
      if (color_is_dark[data.squad]) {
        new_entry.addClass('dark-entry');
      }
      var textarea = $("<textarea class='entry-text' rows='1' />");
      textarea.attr('id', numeric_date + '_' + entry_id);
      textarea.val(data.text);
      new_entry.append(textarea);
      new_entry.append(
        "<img" +
        "  class='entry-loading'" +
        "  src='" + base_url + "images/ajax-loader.gif'" +
        "  alt='loading'" +
        "/>" +
        "<span class='save-error'>!</span>" +
        "<div class='action-links'>" +
        "  <a href='#' class='delete-entry-button'>" +
        "    <span class='delete'>✖</span>" +
        "    <span class='action-links-text'>Delete</span>" +
        "  </a>" +
        "  <a href='#' class='entry-history-button'>" +
        "    <span class='history'>≡</span>" +
        "    <span class='action-links-text'>History</span>" +
        "  </a>" +
        "  <span class='right-action-links action-links-text'>" +
        "    " + truncated_squad_name(data.squad, 12) +
        "  </span>" +
        "  <div class='clear'></div>" +
        "</div>"
      );
      var current_entries =
        $('td.day#' + numeric_date + ' textarea.entry-text');
      var insert_before_this_entry = null;
      current_entries.each(function(i, textarea_element) {
        var id_parts = textarea_element.id.split("_");
        var candidate_entry_id = id_parts[1];
        if (
          creation_times[candidate_entry_id] === undefined ||
          creation_times[candidate_entry_id] > data.creation_time
        ) {
          insert_before_this_entry = $(textarea_element).closest('div.entry');
          return false;
        }
        return true;
      });
      if (insert_before_this_entry === null) {
        insert_before_this_entry =
          $('td.day#' + numeric_date + ' div.entry-container-spacer');
      }
      insert_before_this_entry.before(new_entry);
      var textarea_element = new_entry.find('textarea.entry-text')[0];
      textarea_element.style.height = 'auto';
      textarea_element.style.height = (textarea_element.scrollHeight) + 'px';
      creation_times[entry_id] = data.creation_time;
      $('textarea.entry-text').each(
        function (i) { $(this).attr('tabindex', i + 1); }
      );
    }
  );
});
