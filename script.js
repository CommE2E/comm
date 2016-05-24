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

$('select#squad_nav').change(function(event) {
  new_squad = event.target.value;
  if (authorized_squads[new_squad] !== true) {
    $('div.password-modal-overlay').show();
  } else {
    window.location.href = base_url+
      "?month="+month+
      "&year="+year+
      "&squad="+new_squad;
  }
});
$('span.password-modal-close').click(function() {
  $('div.password-modal-overlay').hide();
  $('select#squad_nav').val(squad);
  $('input#squad-password').val("");
});
$(window).click(function(event) {
  if (event.target.className === 'password-modal-overlay') {
    $('div.password-modal-overlay').hide();
    $('select#squad_nav').val(squad);
    $('input#squad-password').val("");
  }
});
$('form#password-modal-form').submit(function(event) {
  event.preventDefault();
  $('form#password-modal-form :input').prop("disabled", true);
  $.post(
    'login.php',
    {
      'squad': new_squad,
      'password': $('input#squad-password').val(),
    },
    function(data) {
      console.log(data);
      if (data.success === true) {
        window.location.href = base_url+
          "?month="+month+
          "&year="+year+
          "&squad=" + new_squad;
      } else {
        $('input#squad-password').val("");
        $('form#password-modal-form :input').prop("disabled", false);
      }
    }
  );
});
