fastchat.service('socket', function ($http, $rootScope, $q) {
  
  this.socket = null;

  this.connect = function(token) {
    console.log('Connecting to Socket.io!', io);
    this.socket = io.connect('/', { query: 'token=' + token });
  };

  this.disconnect = function() {
    
  };

  this.isConnected = function() {
    return this.socket != null;
  };

  this.send = function(message) {
    if (!this.isConnected()) {
      console.log('Error! You are not connected to socket.io!');
      return;
    }
    this.socket.emit('message', message);
  };

  this.addListener = function(type, listener) {
    this.socket.removeAllListeners(type);
    this.socket.on(type, listener);
  };

});
