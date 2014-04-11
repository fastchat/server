var currentProfile = null;

$(document).ready(function() {

  if (!API.isLoggedIn()) {
//    showLogIn();
  } else {
    profile();
  }

});


function profile() {
  
  console.log('Getting profile!');

  API.profile(function(err, profile) {
    if (err) return;
    currentProfile = profile;
    setFields(profile);
    getAvatar();
  });

  return false;
};

function setFields(profile) {
  console.log('username: ' + profile['username']);
  $('.profile_name').text('Username: ' + profile['username']);


};

function getAvatar() {

  var xhr = new XMLHttpRequest();

  console.log('HERE');
  // Use JSFiddle logo as a sample image to avoid complicating
  // this example with cross-domain issues.
  xhr.open( "GET", '/user/' + currentProfile._id + '/avatar');
  xhr.setRequestHeader('session-token', API.getToken());
  xhr.responseType = "arraybuffer";

  xhr.onload = function( e ) {
    console.log('GOT SOMETHING');
    console.log(e);
    // Obtain a blob: URL for the image data.
    var arrayBufferView = new Uint8Array( this.response );
    var blob = new Blob( [ arrayBufferView ], { type: "image/png" } );
    var urlCreator = window.URL || window.webkitURL;
    var imageUrl = urlCreator.createObjectURL( blob );
    console.log('URL: ' + imageUrl);
    var img = document.querySelector( "#profileImage" );
    img.src = imageUrl;
  };

  xhr.send();

};

function uploadAvatar() {
  console.log('Uploading!');

  var inputElement = document.getElementById('avatarField');

  console.log('WHAT: ' + inputElement);
  var error = Validate(inputElement);
  if (error) {
    return showError(error);
  } else {
    hideErrors();
  }

  var formData = new FormData();
  formData.append('avatar', inputElement.files[0]);

  var request = new XMLHttpRequest();
  request.open('POST', '/user/' + currentProfile._id + '/avatar');
  request.setRequestHeader('session-token', API.getToken());
  request.send(formData);
  
  return false;
};

function progressHandlingFunction(event) {
  
}

function showError(error) {
  $('#upload_errors').text(error);
  $('#upload_errors').show();
  return false;
}

function hideErrors() {
  $('#upload_errors').hide();
}

function logout() {
  API.logout(function(err, success) {
    window.location.replace(url() + '/index.html');
  });
};


// form validation
function Validate(arrInputs) {

  var _validFileExtensions = [".jpg", ".jpeg", ".bmp", ".gif", ".png"];
  var _validTypes = ["image/jpeg", "image/gif", "image/png"];

  if (!arrInputs.files.length) {
    return 'You must upload an image file!';
  }

  for (var i = 0; i < arrInputs.files.length; i++) {

    var oInput = arrInputs.files[i];
    var type = oInput.type;
    if (_validTypes.indexOf(type) > -1) {
      var sFileName = oInput.name;
      if (sFileName.length > 0) {
        var blnValid = false;
        for (var j = 0; j < _validFileExtensions.length; j++) {
          var sCurExtension = _validFileExtensions[j];
          if (sFileName.substr(sFileName.length - sCurExtension.length, sCurExtension.length).toLowerCase() == sCurExtension.toLowerCase()) {
	    return;
            break;
          }
        }

        if (!blnValid) {
          return 'The file you uploaded is not valid!';
        }
      }
    }
  }

  return;
}

function encode (input) {
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;

    while (i < input.length) {
        chr1 = input[i++];
        chr2 = i < input.length ? input[i++] : Number.NaN; // Not sure if the index 
        chr3 = i < input.length ? input[i++] : Number.NaN; // checks are needed here

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }
        output += keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                  keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }
  
  console.log('DONE ENCODING');
    return output;
}
