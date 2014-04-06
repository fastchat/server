
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
 */
Array.prototype.indexOfEquals = function(val) {
  for (var i = 0; i < this.length; i++) {

    if ( this[i].equals !== 'undefined' && this[i].equals(val) ) {
      return i;
    }
  }
  return -1;
}
