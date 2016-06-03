var session_id = Math.floor(0x80000000 * Math.random()).toString(36);
var new_squad = null;

var original_values = {};
$('textarea').each(function(i, element) {
  original_values[element.id] = element.value;
});

$('textarea').on('input', function(event) {
  $.post(
    'save.php',
    {
      'text': event.target.value,
      'day': event.target.id,
      'month': month,
      'year': year,
      'squad': squad,
      'prev_text': original_values[event.target.id],
      'session_id': session_id,
      'timestamp': Date.now(),
    },
    function(data) {
      console.log(data);
      if (data.error === 'concurrent_modification') {
        alert(
          "Some one is editing at the same time as you! "+
            "Please refresh and try again."
        );
      }
    }
  );
});

$(window).click(function(event) {
  if ($(event.target).hasClass('modal-overlay')) {
    $('div.modal-overlay').hide();
  }
});
$('span.modal-close').click(function() {
  $('div.modal-overlay').hide();
});

$('select#squad_nav').change(function(event) {
  new_squad = event.target.value;
  if (authorized_squads[new_squad] !== true) {
    $('div.squad-password-modal-overlay').show();
    $('div.squad-password-modal input')
      .filter(function() { return this.value === ""; })
      .first()
      .focus();
  } else {
    window.location.href = base_url+"&squad="+new_squad;
  }
});
$('div.squad-password-modal span.modal-close').click(function() {
  $('select#squad_nav').val(squad);
  $('input#squad-password').val("");
  $('div.squad-password-modal span.modal-form-error').text("");
});
$(window).click(function(event) {
  if ($(event.target).hasClass('squad-password-modal-overlay')) {
    $('select#squad_nav').val(squad);
    $('input#squad-password').val("");
    $('div.squad-password-modal span.modal-form-error').text("");
  }
});
$('div.squad-password-modal form').submit(function(event) {
  event.preventDefault();
  $('div.squad-password-modal input').prop("disabled", true);
  $.post(
    'auth_squad.php',
    {
      'squad': new_squad,
      'password': $('input#squad-password').val(),
    },
    function(data) {
      console.log(data);
      if (data.success === true) {
        window.location.href = base_url+"&squad="+new_squad;
        return;
      }
      $('input#squad-password').val("");
      $('div.squad-password-modal input').prop("disabled", false);
      if (data.error === 'invalid_credentials') {
        $('div.squad-password-modal span.modal-form-error')
          .text("wrong password");
      } else {
        $('div.squad-password-modal span.modal-form-error')
          .text("unknown error");
      }
    }
  );
});

$('a#log-in-button').click(function() {
  $('div.log-in-modal-overlay').show();
  $('div.log-in-modal input')
    .filter(function() { return this.value === ""; })
    .first()
    .focus();
});
$('div.log-in-modal span.modal-close').click(function() {
  $('input#log-in-password').val("");
  $('div.log-in-modal span.modal-form-error').text("");
});
$(window).click(function(event) {
  if ($(event.target).hasClass('log-in-modal-overlay')) {
    $('input#log-in-password').val("");
    $('div.log-in-modal span.modal-form-error').text("");
  }
});
$('div.log-in-modal form').submit(function(event) {
  event.preventDefault();
  var username = $('input#log-in-username').val();
  var valid_username_regex = /^[a-zA-Z0-9-_]+$/;
  if (username.search(valid_username_regex) === -1) {
    $('input#log-in-username').val("");
    $('input#log-in-username').focus();
    $('div.log-in-modal span.modal-form-error')
      .text("alphanumeric usernames only");
    return;
  }
  $('div.log-in-modal input').prop("disabled", true);
  $.post(
    'login.php',
    {
      'username': username,
      'password': $('input#log-in-password').val(),
    },
    function(data) {
      console.log(data);
      if (data.success === true) {
        location.reload();
        return;
      }
      $('div.log-in-modal input').prop("disabled", false);
      if (data.error === 'invalid_parameters') {
        $('input#log-in-username').val("");
        $('input#log-in-username').focus();
        $('div.log-in-modal span.modal-form-error')
          .text("user doesn't exist");
      } else if (data.error === 'invalid_credentials') {
        $('input#log-in-password').val("");
        $('input#log-in-password').focus();
        $('div.log-in-modal span.modal-form-error')
          .text("wrong password");
      } else {
        $('input#log-in-username').val("");
        $('input#log-in-password').val("");
        $('input#log-in-username').val("");
        $('div.log-in-modal span.modal-form-error')
          .text("unknown error");
      }
    }
  );
});

$('a#register-button').click(function() {
  $('div.register-modal-overlay').show();
  $('div.register-modal input')
    .filter(function() { return this.value === ""; })
    .first()
    .focus();
});
$('div.register-modal span.modal-close').click(function() {
  $('input#register-password').val("");
  $('input#register-confirm-password').val("");
  $('div.register-modal span.modal-form-error').text("");
});
$(window).click(function(event) {
  if ($(event.target).hasClass('register-modal-overlay')) {
    $('input#register-password').val("");
    $('input#register-confirm-password').val("");
    $('div.register-modal span.modal-form-error').text("");
  }
});
$('div.register-modal form').submit(function(event) {
  event.preventDefault();
  var password = $('input#register-password').val();
  var confirm_password = $('input#register-confirm-password').val();
  if (password.trim() === '') {
    $('input#register-password').val("");
    $('input#register-confirm-password').val("");
    $('input#register-password').focus();
    $('div.register-modal span.modal-form-error')
      .text("empty password");
    return;
  }
  if (password !== confirm_password) {
    $('input#register-password').val("");
    $('input#register-confirm-password').val("");
    $('input#register-password').focus();
    $('div.register-modal span.modal-form-error')
      .text("passwords don't match");
    return;
  }
  var username = $('input#register-username').val();
  var valid_username_regex = /^[a-zA-Z0-9-_]+$/;
  if (username.search(valid_username_regex) === -1) {
    $('input#register-username').val("");
    $('input#register-username').focus();
    $('div.register-modal span.modal-form-error')
      .text("alphanumeric usernames only");
    return;
  }
  $('div.register-modal input').prop("disabled", true);
  $.post(
    'register.php',
    {
      'username': username,
      'password': password,
    },
    function(data) {
      console.log(data);
      if (data.success === true) {
        location.reload();
        return;
      }
      $('div.register-modal input').prop("disabled", false);
      if (data.error === 'username_taken') {
        $('input#register-username').val("");
        $('input#register-username').focus();
        $('div.register-modal span.modal-form-error')
          .text("username already taken");
      } else {
        $('input#register-username').val("");
        $('input#register-password').val("");
        $('input#register-username').focus();
        $('input#register-confirm-password').val("");
        $('div.register-modal span.modal-form-error')
          .text("unknown error");
      }
    }
  );
});

$('a#log-out-button').click(function() {
  $.post(
    'logout.php',
    {},
    function(data) {
      window.location.href = base_url;
    }
  );
});

$('a#user-settings-button').click(function() {
  $('div.user-settings-modal-overlay').show();
  $('div.user-settings-modal input')
    .filter(function() { return this.value === ""; })
    .first()
    .focus();
});
$('div.user-settings-modal span.modal-close').click(function() {
  $('input#change-current-password').val("");
  $('input#change-new-password').val("");
  $('input#change-confirm-password').val("");
  $('div.user-settings-modal span.modal-form-error').text("");
});
$(window).click(function(event) {
  if ($(event.target).hasClass('user-settings-modal-overlay')) {
    $('input#change-current-password').val("");
    $('input#change-new-password').val("");
    $('input#change-confirm-password').val("");
    $('div.user-settings-modal span.modal-form-error').text("");
  }
});
$('div.user-settings-modal form').submit(function(event) {
  event.preventDefault();
  var new_password = $('input#change-new-password').val();
  var confirm_password = $('input#change-confirm-password').val();
  if (new_password.trim() === '') {
    $('input#change-new-password').val("");
    $('input#change-confirm-password').val("");
    $('input#change-new-password').focus();
    $('div.user-settings-modal span.modal-form-error')
      .text("empty password");
    return;
  }
  if (new_password !== confirm_password) {
    $('input#change-new-password').val("");
    $('input#change-confirm-password').val("");
    $('input#change-new-password').focus();
    $('div.user-settings-modal span.modal-form-error')
      .text("passwords don't match");
    return;
  }
  $('div.user-settings-modal input').prop("disabled", true);
  $.post(
    'change_password.php',
    {
      'old_password': $('input#change-old-password').val(),
      'new_password': new_password,
    },
    function(data) {
      console.log(data);
      $('div.user-settings-modal input').prop("disabled", false);
      $('input#change-old-password').val("");
      if (data.success === true) {
        $('div.user-settings-modal-overlay').hide();
        $('input#change-new-password').val("");
        $('input#change-confirm-password').val("");
        $('div.user-settings-modal span.modal-form-error').text("");
      } else if (data.error === 'invalid_credentials') {
        $('input#change-old-password').focus();
        $('div.user-settings-modal span.modal-form-error')
          .text("wrong current password");
      } else {
        $('input#change-new-password').val("");
        $('input#change-confirm-password').val("");
        $('input#change-old-password').focus();
        $('div.user-settings-modal span.modal-form-error')
          .text("unknown error");
      }
    }
  );
});
