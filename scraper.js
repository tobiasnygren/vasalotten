'use strict';
let fs = require('fs');
let axios = require('axios');
let cheerio = require('cheerio');
let twilio = require('twilio');
let dotenv = require('dotenv');

//init dotenv
dotenv.load();

const base_url = process.env.BASE_URL;

axios.get(base_url).then( (response) => {
  let $ = cheerio.load(response.data);
  let splits = [];
  $('tr.split').each( (i, elm) => {

    let desc_value = $(elm).find('.desc').text();
    let place_value = $(elm).find('.place').text();
    place_value = parseInt( place_value );

    if( false === isNaN( place_value ) ){

       splits.push({
           desc: desc_value,
           place: place_value,
       });

    }

  });
  return(splits);
})
.then ( (splits) => {

  fs.readFile('/tmp/last-run.json', (err, data) => {
    if (err) throw err;

    data = JSON.parse(data);

    if( process.env.ENVIRONMENT === 'development' || ( JSON.stringify(data) !== JSON.stringify(splits) ) ){

	var latest = splits[splits.length-1];

	var message = latest.place +" (" +latest.desc +")";

	sendSMS(message);
    }


   });

  fs.writeFile('/tmp/last-run.json', JSON.stringify(splits), (err) => {
	if (err) throw err;
  });

});

let sendSMS = function(message){

	const accountSid = process.env.TWILIO_ACCOUNT_ID;
	const authToken = process.env.TWILIO_AUTH_TOKEN;
	const client = require('twilio')(accountSid, authToken);

 	const from_phone = process.env.TWILIO_FROM_PHONE;
	const to_phone = process.env.TO_PHONE;

	client.messages.create({
    		body: message,
    		to: to_phone,
    		from: from_phone
	})
	.then((message) => console.log(message.sid));
};
