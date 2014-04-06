var totalMade = 0;

$(document).ready(function() {

  console.log('START');
  $('.user').on('input', inputChange);

});

function inputChange(e) {


  var fields = $('.user');
  
  var emptyFields = [];

  for (var i = 0; i < fields.length; i++) {
    var scheme = fields.eq(i);
    if ( !scheme.val().trim() ) {
      emptyFields.push(scheme);
    }
  }

  if (emptyFields.length === 0) {
    ++totalMade;
    $('<br class="spot' + totalMade + '"/><input id="input_user" type="text" class="form-control user spot' + totalMade + '" placeholder="Username">').appendTo( $('#input_usernames div') );
    
    $(document.body).on('input', '.user', inputChange);
  } else if (emptyFields.length > 1) {
    console.log('TOO MANY ' + emptyFields.length);
    for (var i = 1; i < emptyFields.length; i++) {

      var classNames = emptyFields[i].attr('class').split(' ');
      console.log('Names ' + JSON.stringify(classNames, null, 4));
      var lastClass = classNames[classNames.length - 1];
      console.log('LAST ' + lastClass);
      $( '.' + lastClass ).remove();
    }
  }

};


function newGroup() {

  var fields = $('.user');
  var toInvite = [];

  for (var i = 0; i < fields.length; i++) {
    var scheme = fields.eq(i);
    var val = scheme.val().trim();
    if ( val ) {
      toInvite.push(val);
    }
  }

  if (toInvite.length === 0) {
    $('#group_errors').text('You must invite at least one person!');
    $('#group_errors').show();
    return false;
  }

  var text = 'Let\'s chat!';
  var name = $("#input_group_name").val();
 
  API.newGroup(name, text, toInvite, function(err, group) {
    if (err) {
      $('#group_errors').text(err.responseJSON.error);
      $('#group_errors').show();
    } else {
      window.location.replace(url() + '/chat.html');
    }
  });

  return false;

};


/*
  $(function() {
    var barVisitDiv = $('#bars_visit');
    var i = $('#bars_visit p').size() + 1;
    

    $('#addBar').on('click', function() {
      $('<p><label for="bars"><input type="text" id="bars" size="20" name="bars_' + i +'" value="" placeholder="Bar ID" /></label> <input size="30" type="text" id="bar_subtext" name="bar_subtext_' + i + '" placeholder="Featured Beer or Subtext" /> <a href="#" id="removeBar">Remove</a></p>').appendTo(barVisitDiv);
      i++;
      return false;
    });
    

    $(document.body).on('click', '#removeBar', function() {
      if( i > 2 ) {
        $(this).parents('p').remove();
        i--;
      }
      return false;
    });
  });
*/

  /**
	   $('#new_group').editable({
	   value: '',
	   autotext: 'never',
	   emptytext: '',
	   display: false,
	   url: function(params) {
	   var q = new $.Deferred;
	   if(params.value && params.value.trim() === '') {
	   return q.reject('Group Name is required!');
	   } else {
	   API.newGroup(params.value, function(err, group) {
	   if (!err && group) {
	   getGroupsAndUpdateUI();
	   getProfile();
	   q.resolve();
	   } else {
	   q.reject(err);
	   }
	   });
	   }
	   },
	   success: function(response, newValue) {
	   $('#new_group').editable('setValue', null)
	   .editable('option', 'pk', null);
	   }
	   });
  */
