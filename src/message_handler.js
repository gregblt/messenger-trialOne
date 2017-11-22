// Load the Cloudant library.
var Cloudant = require('cloudant');
var curl = require('curlrequest');
const messageSender=require('./message_sender')
const strings = require('../ressources/strings/strings.json')
var Promise = require("bluebird");
// WIT
const {Wit, log} = require('node-wit');
const WIT_TOKEN_FR = process.env.WIT_TOKEN_FR;
const WIT_TOKEN_EN = process.env.WIT_TOKEN_EN;


dict=strings
lang='en'
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN

var me = process.env.CLOUDANT_ACCOUNT; // Set this to your own account
var password = 'f5c52644fc1534b5cab27d0d007048b1f04a47466fc27ed4e871e7f34004f8fe';
var password = process.env.CLOUDANT_PASSWORD;
// Initialize the library with my account.
var cloudant = Cloudant({account:me, password:password});

cloudant.db.list(function(err, allDbs) {
	console.log('All my databases: %s', allDbs.join(', '))
});

USER_DB='trialone_users'
var users = cloudant.db.use(USER_DB)

function firstEntity(nlp, name) {
	return nlp && nlp.entities && nlp.entities && nlp.entities[name] && nlp.entities[name][0];
}

function translate(dict, lang, word) {
    return dict[lang][word];
}

console.log(translate(dict, lang, 'bye'))

function checkUser(sender) {
	// Check if we know the sender
	return new Promise(function(resolve, reject) {

		users.get(sender, function(err, data) {
		    // The rest of your code goes here. For example:
		    if(err) {
		    	console.log("Not in the db");
		    	var URL = "https://graph.facebook.com/v2.6/"+sender+"?fields=first_name&access_token="+FB_PAGE_TOKEN
		    	curl.request(URL, function (err, stdout, meta) {
		    		var answer=JSON.parse(stdout)
		    		var name = answer.first_name
		    		lang='en'
		    		users.insert({ _id: sender, first_name: answer.first_name, lang: lang }, sender, function(err, data) {
		    			if (err) {
		    				return console.log('[users.insert] ', err.message);
		    				reject(err)
		    			}
		    			else {
		    			console.log('You have inserted the user.');
		    			console.log(data);
		    			var doc=data
		    			var user={'name': name, 'lang': lang}
		    			resolve({'user':user,'data':data});
		    			}
		    		});
		    	});
		    }
		    else {
		    	console.log("Found user:", data.first_name);
		    	var name = data.first_name
		    	lang= data.lang
		    	var doc=data;
		    	var user={'name': name, 'lang': lang}
		    	resolve({'user':user,'data':data});
		    }			
		});
	});	
}


module.exports = {


	handleMessage: function(sender, message) {


		
		var p1 = checkUser(sender)

		p1.then(

			function(val) {
		    var user = val.user
		    var doc = val.data
			console.log("user is :")
			console.log(user)
			console.log("data :")
			console.log(doc)

			// Configure the client with the right language
			switch(user.lang) {
			    case 'en':
			        WIT_TOKEN=WIT_TOKEN_EN
			        break;
			    case 'fr':
			        WIT_TOKEN=WIT_TOKEN_FR
			        break;
			    default:
			        console.log('Langue inconnue')
			} 

			const client = new Wit({
			  accessToken: WIT_TOKEN,
			  logger: new log.Logger(log.DEBUG) // optional
			});

			// Processing of the message by wit.ai
			client.message(message.text, {})
			.then((data) => {
				// We got an answer
			  	console.log('Yay, got Wit.ai response: ' + JSON.stringify(data));
				// Let's check what do we have
				const greeting = firstEntity(data, 'greetings');
				const insulte = firstEntity(data, 'insulte');
				const thanks = firstEntity(data, 'thanks');
				const bye = firstEntity(data, 'bye');
				const job_ask = firstEntity(data, 'job_ask');
				const cava = firstEntity(data, 'cava');
				const canard = firstEntity(data, 'Vincent');
				const number = firstEntity(data, 'number');
				const language = firstEntity(data, 'language');

				// Private joke
				var canard_link = "https://www.facebook.com/vincent.demichelis";

				// Check if the message is a request to change the language
				if (language && language.confidence > 0.98) {
					var change=false
					if(language.value == 'français' ) {
						if(user.lang!='fr') {
							user.lang='fr'
							change=true;
						}
						
					}
					else if(language.value == 'english') {
						if(user.lang!='en') {
							user.lang='en'
							change=true;
						}
					}
					if(change) {
						doc.lang=user.lang;
						users.insert(doc, sender, function(err, data) {
							if (err) {
								return console.log('[users.insert] ', err.message);
							}
							else {
								doc._rev=data.rev
				    			console.log('You have inserted the user.');
				    			console.log(data);
				    			messageSender.sendTextMessage(sender, translate(dict, user.lang, 'change_lang') )
							}
						});
					}
					else {
						messageSender.sendTextMessage(sender, translate(dict, user.lang, 'no_change_lang') )

					}
					
				} 
				// Answering to the sender depending on the content of the message
				else if (insulte && insulte.confidence > 0.8) {
					messageSender.sendTextMessage(sender, translate(dict, user.lang, 'calm') )
				} 
				else if (canard && canard.confidence > 0.9) {
					let attachment = {
						"attachment": {
							"type": "template",
							"payload": {
								"template_type": "generic",
								"elements": [{
									"title": translate(dict, user.lang, 'duck'),
									"subtitle": "El famoso Vincenzo",
									"item_url": canard_link,
									"image_url": "https://scontent.fzty2-1.fna.fbcdn.net/v/t1.0-9/1011784_10203218075837224_1901262409_n.jpg?oh=f79ddd4f3345139e8409b3e8f443b352&oe=5A672E2B"
								}]
							}
						}
					}
					messageSender.sendAttachmentMessage(sender, attachment)
				} 
				else if (thanks && thanks.confidence > 0.9) {
					messageSender.sendTextMessage(sender, translate(dict, user.lang, 'you_are_welcome') +" ;).")
				} 
				else if (number && number.confidence > 0.9) {
					messageSender.sendTextMessage(sender, number.value+1)
				} 
				else if (cava && cava.confidence > 0.8) {
					messageSender.sendTextMessage(sender, translate(dict, user.lang, 'feelings'))
				} 
				else if (bye && bye.confidence > 0.98) {
					messageSender.sendTextMessage(sender, translate(dict, user.lang, 'bye')+" "+user.name+"!")
				} 
				else if (job_ask && job_ask.confidence > 0.8) {
					messageSender.sendTextMessage(sender, translate(dict, user.lang, 'work'))
				} 
				else if (greeting && greeting.confidence > 0.98) {
					messageSender.sendTextMessage(sender, translate(dict, user.lang, 'greeting')+" "+user.name+" !")
				} 
				else { 
					messageSender.sendTextMessage(sender, translate(dict, user.lang, 'what?'))
				}
			})
			.catch(console.error);			
			
		}).catch(
			function(err) {
			console.log(err)
		});

	}	
};

