/**
 * Finds the val in the array using the .equals method instead
 * of pointer comparison.
 *
 * @param val The value you want to find
 * @param key An optional key if you are iterating over an array of objects to
 * compare. Useful if you are looking at mongoose objects and want to compare
 * '_id' to the val.
 */
Array.prototype.indexOfEquals = function(val, key) {

  for (var i = 0; i < this.length; i++) {
    if (key) {
      if ( this[i][key] && this[i][key].equals && this[i][key].equals(val) ) {
	return i;
      }
    } else {
      if ( this[i].equals && this[i].equals(val) ) {
	return i;
      }
    }
  }
  return -1;
}
