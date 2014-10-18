# About

This is the server. It's written in Node.js for fast concurrency. It can handle some users at once.

# Features #

1. Users can be created and logged in and out.
2. Users can create group chats.
3. Users can send messages to the people in the chats.
4. Users can leave group chats at anypoint.
5. Push notifications are sent out, but in an intelligent manner.

# Development

Install MongoDB:

Need Homebrew? Copy and paste the following line into the Terminal:
ruby -e "$(curl -fsSL https://raw.github.com/Homebrew/homebrew/go/install)"

Then run:
brew update
brew install mongodb

Once installed, run:
mongod

In a new Terminal Window:
run 'npm install' in this directory to get the dependencies.

Then run:
AWS_KEY=AKIAIOHCTJAAHBIJCIXA AWS_SECRET=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 ENV=development node server.js

# Test

If you want to run the tests, start the server like this:

AWS_KEY=AKIAIOHCTJAAHBIJCIXA AWS_SECRET=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 ENV=test MONGOLAB_URI=mongodb://localhost/test node server.js

Then run:

make test

If you want code coverage, instead of the above command, start the server with this one:

COV_FASTCHAT=true AWS_KEY=AKIAIOHCTJAAHBIJCIXA AWS_SECRET=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 ENV=development MONGOLAB_URI=mongodb://localhost/test node server.js

And then run:

make test-cov


# End Points

## Register
POST /user

{
	"username" : "uniqueusername",
	"password" : "your password"
}

Returns the user:

{
  "__v": 0,
  "username": "MyUserName",
  "password": "$2a$10$2SWFjLxmWO.0zmGL.BCDEOx2Ul78HWPptEpLnu8Zwgjasw4sgqVNy",
  "_id": "532f21306bb3656b3e000001",
  "invites": [],
  "groups": []
}

## Login
POST /login
{
	"username" : "username",
	"password" : "your password"
}

Returns:

{
	"session-token": "4582359082592875"
}

Note:
The session token should be sent as a header 'session-token':'3492384092843' in each request. The server acts as an API and does not store sessions (it does, but that only helps the web app, so I don't use them anywhere). The session token is used to find each user. This means you can only be logged in to what device at a time (logging in again would reset the session token). We will have to fix this. Maybe return the current token.

## Profile
GET /user

Returns:

{
  "profile": {
    "__v": 15,
    "_id": "5330b446a65891c019000001",
    "password": "$2a$10$H6z.3GE7UEMqXQAufcLSdOpH1eeuRc.wlaWWOcfOQvkol2qSp49K2",
    "username": "ethan",
    "unreadCount": 0,
    "devices": [
      "53374cd8d92a00cb65000001"
    ],
    "invites": [],
    "groups": [
      {
        "_id": "5330b472a65891c019000002",
        "name": "Ethan Group"
      },
      {
        "_id": "5334a89752ee52933d00001d",
        "name": "Second Test Group"
      },
      {
        "_id": "5334eda952ee52933d00001f",
        "name": "Ogame"
      },
      {
        "_id": "5334edfb52ee52933d000020",
        "name": "Test"
      }
    ],
    "accessToken": [
      "0140adedc6e9e97e67d811fc3c6e3f627cdbedbd64d2eb11bbb6f29885f04cd78f7be6e318eeeb86a4c5bc7942387344"
    ]
  }
}

Returns:
The currently logged in user.

## Logout
DELETE /logout[?all=true]

Returns: 200 OK

Note:
Destroys the users session-tokens server side. You need to be logged in to call this.
You may pass ?all=true if you want to log out of ALL devices. This will remove ALL session-tokens associated with the user.

## Device Token

GET /user/device

Returns:

[
  {
    "token": "b96902355946b148ff3910bd4453d96bc3eb104780e227ff830f83a8cfb8228c",
    "type": "ios",
    "user": "5330b446a65891c019000001",
    "_id": "53374cd8d92a00cb65000001",
    "__v": 0
  }
]

The devices that have been registered to that user.


POST /user/device
{
	token: '3424424324324adfdsfsd',
	type: 'ios'
}

Note:
'type' can either be 'ios' or 'android'. Anything else returns a 400.

## Get Groups
GET /group

Returns:

[
  {
    "__v": 3,
    "_id": "5334a89752ee52933d00001d",
    "name": "Second Test Group",
    "invites": [
      "53345a8752ee52933d000003",
      "53345a8752ee52933d000003"
    ],
    "messages": [
      "5336eb810abda2ab55000001"
    ],
    "members": [
      {
        "_id": "5330b446a65891c019000001",
        "username": "ethan"
      }
    ]
  },
  {
    "__v": 2,
    "_id": "5334eda952ee52933d00001f",
    "name": "Ogame",
    "invites": [],
    "messages": [
      "5336f3400abda2ab5500000f",
      "533b22648390664404000001"
    ],
    "members": [
      {
        "_id": "5330b446a65891c019000001",
        "username": "ethan"
      }
    ]
  },
  {
    "__v": 5,
    "_id": "5334edfb52ee52933d000020",
    "name": "Test",
    "invites": [],
    "messages": [
      "533b61aab885c9e606000001",
      "533b61f14857acf106000001",
      "533b62188da1b4fa06000001"
    ],
    "members": [
      {
        "_id": "5330b446a65891c019000001",
        "username": "ethan"
      },
      {
        "_id": "5338d3a52deb3a4383000002",
        "username": ".."
      }
    ]
  },
  {
    "__v": 122,
    "_id": "5330b472a65891c019000002",
    "name": "Ethan Group",
    "invites": [],
    "messages": [
      "53322ce2246c08e72d000001",
      "53322cf7246c08e72d000002",
      "533e1395ff9ce8fd23000003",
      "533e13adff9ce8fd23000004",
      "533e13b8ff9ce8fd23000005"
    ],
    "members": [
      {
        "_id": "5330b446a65891c019000001",
        "username": "ethan"
      },
      {
        "_id": "532f270c232bff8e3f000002",
        "username": "t1"
      }
    ]
  }
]


Returns:
An array of all the groups you're in. It also returns the members of the group (id's to usernames), which you can use to map the "from" field you are getting.

## Create Group
# CHANGING SOON
POST /group
{
	"name":"group_name",
	"invitees":[username, username]
}

Returns:
200 OK

Note:
Group Name will soon be optional. It will default to the person's name you are sending it to (and they will see the other name?)

People who are you inviting will be automatically added to the group (the sender is always added). Messages you send will immediatly be delivered to the other parties. You will not need to accept or reject invites.


## Delete Group NOT IMPLEMENTED YET
DELETE /group/:id

Only deletes if user has permission to do so.


## Change Settings for Group NOT IMPLEMENTED YET
PATCH /group/:id
{
	"name": "newName",
	"silent": true,
	"leave": true,
	"addinvitees":[userid, userid],
	"removeinvitees":[userid]
}

This is actually used for a lot of things. Changing the group name, leaving the group,
silencing notifications for that group. It updates your settings for the group. Inviting
people to the group (by adjusting the invitees array.)

## Invite Person to Group
# Depcrecated
PUT /group/:id/invite

{
	"invitees": [username, username]
}

Returns:
200 OK

Note:
This puts the group's _id in the 'invite' array for each of the user's profiles. They will then have to 'accept' the invite.

## Remove invite/person from Group NOT IMPLEMENTED YET
# Depcrecated
PUT /group/:id/uninvite

{
	"uninvites": [username, username]
}

returns 200

## Accept Invitation
# Depcrecated
POST /user/accept
{
	'invite':1
}

Returns:
200 OK

Note:
The number is the number of the invite in the 'invites' array on the profile object. So you're saying, 'accept the invite at index X'. This will add the user to that group, and remove the invitation automatically.

## Messages

## Get Messages from Group PARTIALLY IMPLEMENTED

GET /group/:id/messages?lastMessageDate

Returns:
An array of messages from the group.

Note:
So far it doesn't actually do anything with the lastMessageDate, and will return all messages regardless.


# Socket.io

The instantaneous aspect of Fast Chat is delivered by Socket.io.

## Connection

To connect, you should send the user's session-token in the query field. A typical connection request will look like:

<code>
{
  "headers": {
  "host": "powerful-cliffs-9562.herokuapp.com",
		"connection": "close",
    "cache-control": "max-age=0",
         "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.152 Safari/537.36",
         "accept": "*/*",
         "referer": "http://powerful-cliffs-9562.herokuapp.com/chat.html",
         "accept-encoding": "gzip,deflate,sdch",
         "accept-language": "en-US,en;q=0.8",
         "cookie": "connect.sid=s%3AYYX5EA3EeqcjTX1dfQsB26kf.DV3XDMiVmK51PaGp3%2F4LInOYhhZVscCE50NLR8mWIQY; arp_scroll_position=0",
         "x-request-id": "585b97f9-4893-4cf2-8e3d-908660475c27",
         "x-forwarded-for": "74.74.239.91",
         "x-forwarded-proto": "http",
         "x-forwarded-port": "80",
         "via": "vegur",
         "connect-time": "1",
         "total-route-time": "0",
         "content-length": "0"
     },
     "address": {
         "address": "10.220.195.127",
         "port": 60980
     },
     "time": "Fri Apr 04 2014 03:43:20 GMT+0000 (UTC)",
     "query": {
         "token": "e0edd1af47e27897995bec8b9834292a3a91274dee24ce847fefa480f4c213df7478985b87406f5fb731c9daebadc789",
         "t": "1396583000894"
     },
     "url": "/socket.io/1/?token=e0edd1af47e27897995bec8b9834292a3a91274dee24ce847fefa480f4c213df7478985b87406f5fb731c9daebadc789&t=1396583000894",
     "xdomain": false,
     "issued": 1396583000932
 }
</code>

## Sending messages
Socket.io has different ways of communication, but we are using the events functionality. This means the message has a event name, and the data associated with it.

To send a message, the event is called 'messsage'. The associated data should be:
{
	"text":"this is my message!",
	"group": "5330b472a65891c019000002"
}

Where the group is pointing to the ID of the group.

## Receiving Messages
When connected to Socket.io, you will recieve messages. They will be sent to the 'message' endpoint, and will be of the format:

{
	'text': 'Some text!',
	'from': '39423432942304',
	'group': '3452532523535',
	'sent': '2014-04-04T03:17:14.144Z'
};

Keep in mind that the server fills in the 'from', 'group', 'sent' fields. Sending those fields will do nothing.

## Typing
Socket.io sends messages when someone is typing, so other users in the conversation can get real time feedback.

To send a typing event, send 'typing'. The data you send will tell others if the user has started or stopped typing.

Is typing:
{
	'typing': true,
	'from' : '5525239423',
	'group': '35235234'
}

Is no longer typing:
{
	'typing': false,
	'from' : '5525239423',
	'group': '35235234'
}

Listening on the 'typing' event will let you hear these events.
