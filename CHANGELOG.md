# 0.6.0 (April 6th, 2015)
* First Release to NPM
* Better Environment Key Management
  * Broke Apple Push Notifications out into their own class, which encapsulates the push certificates #119
  * Broke Google Cloud Notifications out int their own class, which encapsulates of the api key. #120
  * Broke AWS knox into it's own class, also encapsulating the AWS keys. #118
* All of this encapsulation allows for FastChat to run with **no** environment keys set. It will attempt to connect to the localhost Mongo (or MONGOLAB_URI), and start on 6190.

* Added in Coveralls Badge. #111
* Added to Travis CI. #110
* Added CoffeeScript Linting. #109
* Added a Deploy to Heroku Button. #102 

* Switched to Hapi. #100
  * Moved Server to its own file. #103
  * Rewrote integration tests using Hapi's .inject. #105
  * Added Code Coverage using Blanket-Node. #106
  * Moved Integration tests to server tests. #107


* Broke out Web Client to it's own project. #104
  * This will be added back in as an NPM Module. Slated for 0.7.0.
