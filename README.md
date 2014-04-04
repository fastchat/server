# New Version

You no longer will need to "accept" an invite to be put into a group.
You can awlays leave the group, or block the user, or silence notifications.

Soooo, to faciliate this, we will have users upload their contacts to the server to find their friends using Fast Chat. This will take their names, phone numbers, and emails and save them. Then it will look through the database for matches on their phone number or emails, and return the users who are on the server.

They type in "Mike" and it shows the mike's who are using our app first that they have in their contacts, and then the mike's who are not using in our system below that. If they select any of them (via phone number or email), we'll send them a text/email asking to join fast chat.

Let's assume they select Mike that's in our system, known as "mike". They they send a message to Mike.

This will automatically:
1. Create a new group and add the user "ethan" and "mike" to it.
2. It will Send the message to all participants in the group - but since "mike" is not in the group yet (he's not looking at it), he'll get a push notification.
3. The conversation will continue as usual at this point

## To Change

This means, when you create a new group, you can optionally send some text along with the POST request (your first message, with images, etc), and it will create the group and then send the message to it.

This will send out pushes to anyone in it, and send a text/email notification to those people not in it.

This isn't that big a change really. Fix the other shit first.




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


# Test

Start the server to hit the test database:
MONGOLAB_URI=mongodb://localhost/test node server.js

Then, in a new tab, run the tests:
npm test



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
  "__v": 0,
  "username": "MyUserName",
  "password": "$2a$10$2SWFjLxmWO.0zmGL.BCDEOx2Ul78HWPptEpLnu8Zwgjasw4sgqVNy",
  "_id": "532f21306bb3656b3e000001",
  "invites": [],
  "groups": []
}

The Logged in user

## Logout
DELETE /logout

Returns: 200 OK

Note:
Destroys the users session token server side. You need to be logged in to call this.

## Device Token

GET /user/device

Returns:
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
    "name": "Another Group",
    "invites": [],
    "messages": [],
    "members": [
      "532505565fbd8abe15000001",
      "53250530271351af15000001"
    ]
  }
]

Returns:
An array of all the groups you're in.

## Create Group
POST /group
{
	"name":"group_name",
	"invitees":[username, username]
}

Returns:
200 OK

Note:
Automatically adds the creator to the group. You don't need to send that user in the invitees array. That array doesn't actually do anythign yet.


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
	"invitees": [username, username]
}

Returns:
200 OK

Note:
This puts the group's _id in the 'invite' array for each of the user's profiles. They will then have to 'accept' the invite.

## Remove invite/person from Group NOT IMPLEMENTED YET
PUT /group/:id/uninvite

{
	"uninvites": [username, username]
}

returns 200

## Accept Invitation
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
