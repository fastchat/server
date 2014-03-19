# About

This is the server. It's written in Node.js for fast concurrency. It can handle 10 users at once.

# Features

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
node server.js



# Flow

Thinking about the flow of the user. They can create, or be invited to, a group to chat in. Let's say they are in a group with 3 other people (4 total). They hop on their iPhone and send a message... what happens?

1. They launch the iOS app. It loads a saved Session Token and immediatly tries to connect to the socket.
2. The token is valid, and the user connects.n
3. The app asks to join *all* the rooms the user is a part of.
4. [The app also does some other loading of server side info (groups, etc)].
5. The user opens the group they want to send the message too.
6. The app asks the server for all messages since it's last message date.
7. The server responds with the JSON messages.
8. The app updates the conversation view with the new data, and caches it.
9. [this can happen in a background thread when the app launches, so when the user navigates to the convo, it's automatically up to date].
10. The user types their message.
11. The user hits send.
12. The message is sent to the socket. The socket gets that message and 'emits' it to all participants of the room. This is possible, the client just needs to send "hey, i'm sending info to this room." If the client says the wrong room that the client is also a part of... it'll go to the wrong group. Server side checks to ensure the client is actually in that room. (no guessing rooms!)
13. All connected members get that message.

Next:

14. A callback for each member is initiated. We know if you read it.
15. If you didn't read it, after 30 seconds...
	16. Send a push notification to all devices.
17. When you do acknowledge the messages, clear all push notifications.

# End Points

## Register
POST /register

{
	"email" : "youremail",
	"password" : "your password"
}

Returns:

{
	"user": "youremail"
}

## Login
POST /login
{
	"email" : "youremail",
	"password" : "your password"
}

Returns:

{
	"session-token": "4582359082592875"
}

## Get Groups
GET /group

Returns:

[
  {
    "__v": 0,
    "_id": "5325e046c68db1c326000001",
    "name": "Coolest Group",
    "invites": [],
    "messages": [],
    "members": [
      "532505565fbd8abe15000001",
      "53250530271351af15000001"
    ]
  },
  {
    "__v": 0,
    "_id": "5325e090f82381db26000001",
    "name": "Coolest Group",
    "invites": [],
    "messages": [],
    "members": [
      "532505565fbd8abe15000001",
      "53250530271351af15000001"
    ]
  }
]

returns an array of all the groups you're in (and their settings?)

## Create Group
POST /group
{
	"name":"group_name",
	"invitees":[userid, userid]
}

Automatically adds the creator to the group.

Returns:
200 OK


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
PUT /group/:id/invite

{
	"invitees": [email, email]
}

returns 200 OK


## Remove invite/person from Group
PUT /group/:id/uninvite

{
	"uninvites": [email, email]
}

returns 200


## Messages

## Get Messages from Group

GET /group/:id/messages?lastMessageDate

Gets the messages of the group. Sorts by sent date. Only returns the last 30. (20?)
