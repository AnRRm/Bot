/*
 * message.js
 * This file contains The main Code Of TotoBot
 */
 
// Needed set of libraries
const recastai = require('recastai')
const unirest = require('unirest');



// This function is the core of the bot behaviour
const replyMessage = (message) => {
    // Instantiate Recast.AI SDK, just for request service
    const request = new recastai.request(process.env.REQUEST_TOKEN, process.env.LANGUAGE)
	
    // Get text from message received
    const text = message.content

    // Get senderId to catch unique conversation_token
    const senderId = message.senderId


    // Call Recast.AI SDK, through /converse route
    request.converseText(text, {
            conversationToken: senderId
        })
        .then(result => {

            // Variable to store the content of response
			var responseBuilder = ''
			// Variable to Indicate the built response
            var processResponseIndicator = false
			
			
            // Test On the action
			// --------- Case 1 : ousetrouve Or athan
			//					  In this case we need a call to google maps API to get the Location coordinates
			// 					  then using the coordinates we call API Aladhan 	
            if (result.action) {
                if (result.action.slug == 'ousetrouve' || result.action.slug == 'athan') {
                    // Response will be built here	> set processResponseIndicator to true		
                    processResponseIndicator = true
                    if (result.entities) {
                        if (undefined != result.entities.location_ost && result.entities.location_ost.length) {

                            // Variable to hold the given location
							var location_ = result.entities.location_ost[0].raw
							
							//prepare url for geocode api
                            var googleAPIurl = 'http://maps.googleapis.com/maps/api/geocode/json?language=fr&address=' + location_

                            // send http get request
                            unirest.get(googleAPIurl)
                                .send()
                                .end(response => {
                                    if (response.ok) {										
										
										// Case 1-1: the detected action is 'ousetrouve'
										// build direclty a response 
										// response template: xxxx se trouve dand la région: REGION/PAYS
                                        if (result.action.slug == 'ousetrouve') {
											console.log("Intent detected")
                                            if (response.body.results.length) {
												
												console.log('We build the response')
                                                responseBuilder += location_ + ' se trouve dans la région: ' + (response.body.results[0].address_components[2].long_name)
                                                console.log(responseBuilder)
												message.addReply({
                                                    type: 'text',
                                                    content: responseBuilder
                                                })
                                                message.reply().then(() => {
                                                    // Do some code after sending messages
                                                })
                                            }
											else
											{
												console.log('We dont build the response a problem occured')
												message.addReply({
                                                    type: 'text',
                                                    content: 'Malheureusement vous avez atteint le nombre maximum de requettes aujourdhui. Optez pour une version PREMIUM :)'
                                                })
                                                message.reply().then(() => {
                                                    // Do some code after sending messages
                                                })
											}
                                        }
										
										
										
										// Case 1-2: the detected action is 'athan'
										// another http request need to be sent to get athan timing
										// Response template 
										// Les horraire de prières Aujourdhui à XXXX: Fajr à HH:MM, Dhuhr à HH:MM, Asr à HH:MM, Maghrib à HH:MM, et Isha à HH:MM.
                                        if (result.action.slug == 'athan') {
											
											// helpers to build the next url
                                            var milliseconds = (new Date).getTime()
											milliseconds = Math.round(milliseconds / 1000)
                                            var lat = response.body.results[0].geometry.location.lat;
											console.log(lat)
                                            var lng = response.body.results[0].geometry.location.lng;
											console.log(lng)
                                            var athanurl = 'http://api.aladhan.com/timings/' + milliseconds + '?latitude=' + lat + '&longitude=' + lng + '&method=2';
											console.log(athanurl)
                                            // http get request (to adhan API)
											unirest.get(athanurl)
                                                .send()
                                                .end(response => {

                                                        if (response.status == 200) {

                                                            var responseBuilder = "Les horraire de prières Aujourdhui à " + location_ + ": Fajr à " + response.body.data.timings.Fajr + ", Dhuhr à " + response.body.data.timings.Dhuhr + ", Asr à " + response.body.data.timings.Asr + ", Maghrib à " + response.body.data.timings.Maghrib + ", et Isha à " + response.body.data.timings.Isha + "."

                                                            message.addReply({
                                                                type: 'text',
                                                                content: responseBuilder
                                                            })

                                                            message.reply().then(() => {

                                                            })
                                                        }
                                                    }

                                                )
                                        }
                                    }
									else
									{
										message.addReply({
                                            type: 'text',
                                            content: 'le nombre de requetes maximum est atteint, essayez plus tard'
                                        })

                                        message.reply().then(() => {

                                        })
									}
                                })
                        } else {
                            message.addReply({
                                type: 'text',
                                content: 'Malheureusement je ne reconnais pas la ville que vous avez indiqué, Verifiez l\'orthographe svp!'
                            })
                            message.reply().then(() => {
                                // Do some code after sending messages
                            })

                        }
                    }

                }
            }

			// --------- Case 3 : Greetings
			//					  In this case we need a call facebook API to persolize the answer
			// 					  Used information: Gender / Name	
			// 					  Response Template:
			//					  Salut monsieur/madame XXX. Je suis le TotoBot de Test, je ne comprends que le francais et je peux te donner l'actualité et la météo, localiser géographiquement les villes du monde, et te donner les h
            if (result.action) {
                if (result.action.slug == 'greetings') {
					
					// Response should be built here set processResponseIndicator to true
                    processResponseIndicator = true

                    // extract the personal secure ID from the Recast given information
					const parts = message.chatId.split('-')
                    const FacebookPSID = parts[1]
					
                    // facebook API
                    var url = 'https://graph.facebook.com/v2.6/' + FacebookPSID + '?fields=first_name,last_name,gender,locale,timezone&access_token=' + process.env.FB_TOKEN

                    // send http get request
                    unirest.get(url)
                        .send()
                        .end(response => {
							// Test on the response if it has been successfuly executed
                            if (response.ok) {
								
                                var person = JSON.parse(response.body)
                                var responseBuilder = 'Salut '
                                if (person.gender == 'male') {
                                    responseBuilder += process.env.MONSIEUR + person.first_name + '. Je suis le TotoBot de Test, je ne comprends que le francais et je peux te donner l\'actualité et la météo, localiser géographiquement les villes du monde, et te donner les horraires de prières.'
                                } else {
                                    responseBuilder += process.env.MADAME + person.first_name + '. Je suis le TotoBot de Test, je ne comprends que le francais et je peux te donner l\'actualité et la météo, localiser géographiquement les villes du monde, et te donner les horraires de prières.'
                                }
                                message.addReply({
                                    type: 'text',
                                    content: responseBuilder
                                })
                                message.reply().then(() => {
                                    // Do some code after sending messages
                                })
                            } else {

                            }

                        })
                }
            }			
			
			// --------- Case 3 : get-news
			//					  In this case we need to call news API to get the news
            if (result.action) {
                if (result.action.slug == 'get-news') {
					
					// Set processResponseIndicator to true
                    processResponseIndicator = true


                    // NEWS API URL
                    var url = 'https://newsapi.org/v2/top-headlines?sources=google-news-fr&apiKey=' + process.env.NEWSAPI_TOKEN

                    // send http get request
                    unirest.get(url)
                        .send()
                        .end(response => {

                            // Loop on all the found news / provide titles and urls
							if (response.ok) {
                                
                                for (var index = 0; index < response.body.articles.length; index++) {

                                    responseBuilder += response.body.articles[index].title + '\n'
                                    responseBuilder += response.body.articles[index].url + '\n'
                                    message.addReply({
                                        type: 'text',
                                        content: responseBuilder
                                    })
                                    message.reply().then(() => {
                                        // Do some code after sending messages
                                    })
                                    responseBuilder = ''
                                }
                            } else {

                            }

                        })
                }
            }

			// --------- Case 4 : get-weather
			//					  In this case we use weather API structure to get the weather
			// 					  Response template : La météo aujourdhui à Ville_X: légères pluies, la température est de 17.52°C

            if (result.action) {

                if (result.entities) {

                    if (result.action.slug == 'get-weather') {

						processResponseIndicator = true

                        if (undefined != result.entities.location_ost && result.entities.location_ost.length) {


                           
                            const weather = require('openweathermap-js')
                            weather.defaults({
                                appid: process.env.OPENWEATHER_TOKEN,
                                method: 'name',
                                mode: 'json',
                                units: 'metric',
                                lang: 'fr',

                            });
							const location_ = result.entities.location_ost[0].raw
                            weather.forecast({
                                location: location_,
                                language: 'fr'
                            }, function(err, data) {

                                if (!err) {
									
                                    responseBuilder = 'La météo aujourdhui à ' + location_ + ': ' + data.list[1].weather[0].description + ', la température est de ' + data.list[1].main.temp + '°C'
                                    message.addReply({
                                        type: 'text',
                                        content: responseBuilder
                                    })
                                    message.reply().then(() => {
                                        // Do some code after sending messages
                                    })
                                } else {


                                }
                            })

                        }else {
                            message.addReply({
                                type: 'text',
                                content: 'Malheureusement je ne reconnais pas la ville que vous avez indiqué, Verifiez l\'orthographe svp!'
                            })
                            message.reply().then(() => {
                                // Do some code after sending messages
                            })

                        }
						
                    }
                }
            }

            // If there is not any message return by Recast.AI for this current conversation
            if (!result.replies.length) {
                if (!(result.action && result.action.slug == 'garbage-collector') && !processResponseIndicator)
                    message.addReply({
                        type: 'text',
                        content: 'je sais pas comment vous répondre pour l\'instant :('
                    })
            } else {

                // Add each reply received from API to replies stack
                result.replies.forEach(replyContent => message.addReply({
                    type: 'text',
                    content: replyContent
                }))
            }

            // Send all replies
            message.reply()
                .then(() => {
                    // Do some code after sending messages
                })
                .catch(err => {
                    console.error('Error while sending message to channel', err)
                })
        })
        .catch(err => {
            console.error('Error while sending message to Recast.AI', err)
        })

}

module.exports = replyMessage
module.exports = replyMessage