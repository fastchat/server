var memberLookup = {};

function Group(properties) {
  for (var key in properties) {
    if(properties.hasOwnProperty(key)) {
      this[key] = properties[key];
    }
  }

  var self = this;
  this.members.forEach(function(member) {
    memberLookup[member._id] = member.username;
  });
}

Group.usernameFromId = function(id) {
  return memberLookup[id];
};

Group.prototype.usernameFromId = function(id) {
  return memberLookup[id];
}

Group.prototype.groupName = function() {
  if (this.name) {
    return this.name;
  }

  return this.members.map(function(elem){
    return elem.username;
  }).join(', ');
};

Group.prototype.avatarForUser = function(user, api) {
  api.profileImage();
};

function MakeGroups(array) {
  var made = [];
  array.forEach(function(obj) {
    made.push(new Group(obj));
  });
  return made;
}
