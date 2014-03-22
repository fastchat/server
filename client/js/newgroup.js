function newGroup() {
  
  console.log('New Group!');

  var groupName = document.getElementById("input_name").value;
  chat.newGroup(groupName, function(err, group) {
    if (!err && group) {
      console.log('Created Group! ' + JSON.stringify(group, null, 4));
      window.location.replace(url() + '/chat.html');
    }
  });

  return false;
};
