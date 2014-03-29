(function() {

  function SocketServer(token) {
    this.socket = io.connect(BASE_URL, { query: 'token=' + token });
  };


  SocketServer.prototype = {
    
    send: function(message, groupId) {
      console.log('Sent Message');
      this.socket.emit('message', message);
    },

    addListener: function(type, listener) {
      console.log('SOCKET: ' + this.socket);
      this.socket.removeAllListeners(type);
      this.socket.on(type, listener);
    },

  };


  window.socket = window.socket || {};
  window.socket.SocketServer = new SocketServer(API.getToken());

})();

