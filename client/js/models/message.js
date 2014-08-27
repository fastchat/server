function Message(properties) {
  for (var key in properties) {
    if(properties.hasOwnProperty(key)) {
      this[key] = properties[key];
    }
  }

  var self = this;

}

/**
 * Translates the message.text to HTML.
 * This is useful because line breaks will not show up correctly
 * as \n anymore.
 */
Message.prototype.toHTML = function() {
  var html = this.text;
  html.replace(/\\r\\n/g, "<br />");
  return html;
};

function MakeMessages(array) {
  var made = [];
  array.forEach(function(obj) {
    made.push(new Message(obj));
  });
  return made;
}
