# Thoughts on Notifications

Every iOS and Android (and others) register

POST /user/device
{
	type:ios,
	token: 52582982309482304230498234092840
	
}

When we get a mesage to the group, we blast it out over socket.io. Everyone who is currently in the room will get that message instantly.

But what about those people not in the room?

We send out the message to all the devices in the user's in the group.

Get Current Group
	For all users in the group who are not in the room
		For all devices
			Send push notification

Except not.
If you're on the web interface, you're fine - you're still in the room. Unless you go idle (walk away from your computer) for three minutes - then we will update the last active date and treat you as not being at the computer.

If you are on iOS, and close the app...

We should send a push notification to that first.
We need to know what your last connected device was. We'll send a notification to your 'Last Active Date' device.

Also, we need to know when you acknowledge the message.
If you walk away from your computer without closing the chat room - we should assume that's the same as you closing the iOS app. ^^ As above.

When you open the app, we update the last active date. We could do this automatically, if we have a header for the device you're on. Whenever we get an API call from a device we check that header and udpate the last active date on that device. We could just make this the device._id, making lookup trvial.

//So whenever the user reads the message, we send an acknowledge:
//POST /group/423424/acknowledge
// optional body?

This means that you've basically turned on the device.

Or can we just use the connecting to socket.io as that? (also when you turn on the device). But it's not room specific. But should notifications be? Probs not. You'd want them to clear all at once...? Maybe?

Yeah, I think that makes the most sense. When I check the web interface, please clear all notifications from my iPhone.

Which means, lastly, when you check a device, we need to send a "clear" notification to all your other devices, we've sent notifations to them. or maybe we'll just blast it out anyways.




