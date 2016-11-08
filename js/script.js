// Polyfill everything so even ES3 browsers work
import 'babel-polyfill';

import React from 'react';
import ReactDOM from 'react-dom';
import $ from 'jquery';

import Typeahead from './typeahead/typeahead.react'
import ModalManager from './modals/modal-manager.react'
import Calendar from './calendar/calendar.react'

const session_id = Math.floor(0x80000000 * Math.random()).toString(36);

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
    setModal={modalManager.setModal.bind(modalManager)}
    clearModal={modalManager.clearModal.bind(modalManager)}
    ref={(ta) => typeahead = ta}
  />,
  document.getElementById('upper-right'),
);

ReactDOM.render(
  <Calendar
    thisURL={this_url}
    baseURL={base_url}
    navID={original_nav}
    sessionID={session_id}
    year={year}
    month={month}
    entryInfos={entry_infos}
    squadInfos={squad_infos}
    setModal={modalManager.setModal.bind(modalManager)}
    clearModal={modalManager.clearModal.bind(modalManager)}
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
