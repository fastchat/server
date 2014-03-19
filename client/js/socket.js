(function() {

  function SocketServer(token, cb) {
    this.socket = io.connect('localhost', { query: 'token=' + token }); 
    this.socket.on('message', function(message) {
      console.log('Received: ' + JSON.stringify(message, null, 4));
      cb(message);
    });

  };


  SocketServer.prototype = {
    
    send: function(message, groupId) {
      console.log('Sent Message');
      this.socket.emit('message', message);
    },

    
  };


  window.socket = window.socket || {};
  window.socket.SocketServer = SocketServer;

})();

