#
# FastChat
# 2015
#

module.exports = ->

  ###
  Finds the val in the array using the .equals method instead
  of pointer comparison.


  @param val The value you want to find
  @param key An optional key if you are iterating over an array of objects to
  compare. Useful if you are looking at mongoose objects and want to compare
  '_id' to the val.
  ###
  Array.prototype.indexOfEquals = (val, key)->
    for value, i in @
      if key
        return i if value[key] and value[key].equals and value[key].equals val
      else
        return i if value.equals and value.equals val
    return -1

  Array.prototype._diff = (a)->
    @filter (i)-> a.indexOf(i) < 0

  Array.prototype.diff = (a, key)->
    return @_diff(a) unless key
    @filter (i)->
      for value in a
        return no if value[key].equals i[key]
      yes

  Array.prototype.copy = ->
    @slice(0)

  Array.prototype.pushed = ->
    @push.apply @, arguments
    @
