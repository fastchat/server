
/**
 * Is used for iterating over an array of objects, and finding the object
 * which has the given value for the given key.
 *
 * @param key The key you want tested
 * @param val The value you are comparing too
 */
Array.prototype.indexOfKey = function(key, val) {
    for (var i = 0; i < this.length; i++) {
        if (this[i].key === val) {
	  return i;
        }
    }
    return -1;
}

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
