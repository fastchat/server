


















# 0.6.0 (April 6th, 2015)
* First Release to NPM
* Better Environment Key Management:
  * Broke Apple Push Notification management out into it's own class, which encapsulates the push certificates [#119](https://github.com/fastchat/server/issues/119)
  * Broke Google Cloud Notification management out it's own class, which encapsulates the the api key. [#120](https://github.com/fastchat/server/issues/120)
  * Broke AWS access into it's own class, also encapsulating the AWS keys. [#118](https://github.com/fastchat/server/issues/118)
* All of this encapsulation allows for FastChat to run with **no** environment keys set. It will attempt to connect to the localhost Mongo (or MONGOLAB_URI), and start on 6190.

* Added in Coveralls Badge. [#111](https://github.com/fastchat/server/issues/111)
* Added to Travis CI. [#110](https://github.com/fastchat/server/issues/110)
* Added CoffeeScript Linting. [#109](https://github.com/fastchat/server/issues/109)
* Added a Deploy to Heroku Button. [#102](https://github.com/fastchat/server/issues/102)

* Switched to Hapi. [#100](https://github.com/fastchat/server/issues/100)
  * Moved Server to its own file. [#103](https://github.com/fastchat/server/issues/103)
  * Rewrote integration tests using Hapi's .inject. [#105](https://github.com/fastchat/server/issues/105)
  * Added Code Coverage using Blanket-Node. [#106](https://github.com/fastchat/server/issues/106)
  * Moved Integration tests to server tests. [#107](https://github.com/fastchat/server/issues/107)

* Broke out Web Client to it's own project. [#104](https://github.com/fastchat/server/issues/104)
  * This will be added back in as an NPM Module. Slated for 0.7.0.
