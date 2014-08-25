function Group(properties) {
  for (var key in properties) {
    if(properties.hasOwnProperty(key)) {
      this[key] = properties[key];
    }
  }
}
 
Group.prototype.groupName = function() {
  console.log('NAME', this.name);
  if (this.name) {
    return this.name;
  }

  return this.members.map(function(elem){
    return elem.username;
  }).join(', ');
};

function MakeGroups(array) {
  var made = [];
  array.forEach(function(obj) {
    made.push(new Group(obj));
  });
  return made;
}
