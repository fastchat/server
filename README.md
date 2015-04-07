# FastChat Server

[![Build Status](https://travis-ci.org/fastchat/server.svg?branch=develop)](https://travis-ci.org/fastchat/server.svg?branch=develop) [![Coverage Status](https://coveralls.io/repos/fastchat/server/badge.svg?branch=develop)](https://coveralls.io/r/fastchat/server?branch=develop)

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

This is the FastChat Server, written in CoffeeScript on Node.js. It uses socket.io for real time communication, and faciliates users to register, login, create private groups, invite users to groups, and chat. It has many clients that can be used to chat.

* [Web Client](https://github.com/fastchat/web)
* [iOS Client](https://github.com/fastchat/ios)
* [Android Client](https://github.com/fastchat/android)
* [Windows Client](https://github.com/fastchat/windows)

## Quick Start

```
$ npm install fastchat --global

$ fastchat
```

## Features

1. Users registration, login, logout
2. Users can create group chats.
3. Users can send messages to the people in the chats.
4. Users can leave group chats at anypoint.
5. Push notifications are sent out, but in an intelligent manner.
6. Swagger documentation

## Development
FastChat uses Mongo as it's storage, as well as certain environment variables for API keys. If these keys are not present, FastChat will disable that functionality.

### Prerequisites

* MongoDB
* `FASTCHAT_PUSH_CERT` - The cert.pem file for APN
* `FASTCHAT_PUSH_KEY` - The key.pem file for APN
* `GCM_API_KEY` - The Google GCM Key

### Setting up

The FastChat server requires push certificates to be available to send push notifications. To do so in a secure manner, we read in the certificate from an environment variable.

```
FASTCHAT_PUSH_CERT=$(cat cert.pem)
FASTCHAT_PUSH_KEY=$(cat key.pem)
```

Another key you will need is `GCM_API_KEY`, to send messages to Android devices.

Ensure those variables are available to the server.

### Running

In a new Terminal Window:
1. run `npm install` in this directory to get the dependencies.

Then run:
5.
```
AWS_KEY=AMAZON_KEY AWS_SECRET=AMAZON_SECRET ENV=development node server.js
```

Of course, you will need your own key and secret.

## Test

```
make test
```

If you want code coverage, instead of the above command, start the server with this one:

```
make cov-report
```

Or if you just want the number:

```
make cov
```
