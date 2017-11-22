//This is still work in progress
/*
Please report any bugs to nicomwaks@gmail.com

i have added console.log on line 48 


 */
'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const app = express()
var tool=require('./tools');
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN
const db = require('./src/db')
const crypto = require('crypto');
const fetch = require('node-fetch');
var sag = require('sag');

const messageHandler=require('./src/message_handler')
const messageSender=require('./src/message_sender')


let Wit = null;
let log = null;
try {
  // if running from repo
  Wit = require('../').Wit;
  log = require('../').log;
} catch (e) {
  Wit = require('node-wit').Wit;
  log = require('node-wit').log;
}

// reate DB
//db.createDB()

//tool.searchPlace();

app.set('port', (process.env.PORT || 5000))

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// parse application/json
app.use(bodyParser.json())

// index
app.get('/', function (req, res) {
	res.send('hello world i am a secret bot')
})

// for facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
		res.send(req.query['hub.challenge'])
	} else {
		res.send('Error, wrong token')
	}
})

// ----------------------------------------------------------------------------
// Messenger API specific code

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference



// const fbMessage = (id, text) => {
//   const body = JSON.stringify({
//     recipient: { id },
//     message: { text },
//   });
//   const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
//   return fetch('https://graph.facebook.com/me/messages?' + qs, {
//     method: 'POST',
//     headers: {'Content-Type': 'application/json'},
//     body,
//   })
//   .then(rsp => rsp.json())
//   .then(json => {
//     if (json.error && json.error.message) {
//       throw new Error(json.error.message);
//     }
//     return json;
//   });
// };

// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
// const sessions = {};

// const findOrCreateSession = (fbid) => {
//   let sessionId;
//   // Let's see if we already have a session for the user fbid
//   Object.keys(sessions).forEach(k => {
//     if (sessions[k].fbid === fbid) {
//       // Yep, got it!
//       sessionId = k;
//     }
//   });
//   if (!sessionId) {
//     // No session found for user fbid, let's create a new one
//     sessionId = new Date().toISOString();
//     sessions[sessionId] = {fbid: fbid, context: {}};
//   }
//   return sessionId;
// };

// Our bot actions
// const actions = {
//   send({sessionId}, {text}) {
//     // Our bot has something to say!
//     // Let's retrieve the Facebook user whose session belongs to
//     const recipientId = sessions[sessionId].fbid;
//     if (recipientId) {
//       // Yay, we found our recipient!
//       // Let's forward our bot response to her.
//       // We return a promise to let our bot know when we're done sending
//       return fbMessage(recipientId, text)
//       .then(() => null)
//       .catch((err) => {
//         console.error(
//           'Oops! An error occurred while forwarding the response to',
//           recipientId,
//           ':',
//           err.stack || err
//         );
//       });
//     } else {
//       console.error('Oops! Couldn\'t find user for session:', sessionId);
//       // Giving the wheel back to our bot
//       return Promise.resolve()
//     }
//   },
//   // You should implement your custom actions here
//   // See https://wit.ai/docs/quickstart
// };


// to post data
app.post('/webhook/', function (req, res) {

	let messaging_events = req.body.entry[0].messaging
	
	for (let i = 0; i < messaging_events.length; i++) {
		let event = req.body.entry[0].messaging[i]
		
		let sender = event.sender.id
		// Check if we know the sender
		console.log(event)
		if (event.message && event.message.text) {
			if(!event.message.is_echo) {
				let text = event.message.text
				let message = event.message
				if (text === 'Generic'){ 
					console.log("welcome to chatbot")
					//sendGenericMessage(sender)
					continue
				}
				console.log("Sender is : ")
				console.log(sender)
				messageHandler.handleMessage(sender, message)
			}

		}
		if (event.postback) {
			let text = JSON.stringify(event.postback)
			messageSender.sendTextMessage(sender, "Postback received: "+text.substring(0, 200), token)
			//sendTextMessage(sender, "Are you crazy ?! DO NOT CLICK ON THIS BUTTON", token)
			continue
		}
	}
		res.sendStatus(200)
});


// recommended to inject access tokens as environmental variables, e.g.
// const token = process.env.FB_PAGE_ACCESS_TOKEN

// spin spin sugar
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'))
})
