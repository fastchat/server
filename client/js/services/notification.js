fastchat.service('notification', function ($http, $rootScope, $q) {
  
  this.notifications = [];
  this.timer = null;
  this.isBlurred = null;

  var self = this;

  $(window).on('blur', function() {
    console.log('Blurred');
    self.isBlurred = true;
  }).on("focus", function() {
    clearInterval(this.timer);
    console.log('Focused');
    self.isBlurred = false;
    document.title = 'Fast Chat';
    self.timer = null;

    if (self.notifications) {
      for (var i = 0; i < self.notifications.length; i++) {
	var note = self.notifications[i];
	note.close();
      }
      
      self.notifications.length = 0; //clears array
    } else {
      self.notifications = [];
    }
  });


  this.display = function(message) {
    console.log('IS BLURRED?', self.isBlurred);

    if (!self.isBlurred ) return;
    
    var messageNotification = new Notify(Group.usernameFromId(message.from), {
      body: message.text,
      icon: 'img/FastChat-120.png'
    });

    self.notifications.push(messageNotification);
    messageNotification.show();

    setInterval(function() {
      messageNotification.close();
    }, 3000);


//    document.title = document.title === 'Fast Chat' ? '(' + notSeenMessages + ')' + ' - Fast Chat' : 'Fast Chat';
  };



});
