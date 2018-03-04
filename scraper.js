'use strict';
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const twilio = require('twilio');
const dotenv = require('dotenv').load();

const BASE_URL = process.env.BASE_URL;
const LAST_RUN_FILE = process.env.LAST_RUN_FILE;
const DEBUG = (process.env.DEBUG === 'true');

const sendSMS = function(message){

	let accountSid = process.env.TWILIO_ACCOUNT_ID;
	let authToken = process.env.TWILIO_AUTH_TOKEN;
	let client = require('twilio')(accountSid, authToken);

 	let from_phone = process.env.TWILIO_FROM_PHONE;
	let to_phone = process.env.TO_PHONE;

	client.messages.create({
    		body: message,
    		to: to_phone,
    		from: from_phone
	})
	.then((message) => console.log(message.sid));
};


const isTimeToRun = (currentDate) => {

  const runTimes = JSON.parse(process.env.RUN_TIMES);

  for (let range of runTimes) {

    range.start = Date.parse(range.start);
    range.end = Date.parse(range.end);

    if ( ( currentDate >= range.start 
        && currentDate <= range.end ) 
        || true === DEBUG ) {
          return true;
          break;
    }
  }

  return false;
};

if(isTimeToRun(Date.now())){

  console.log( 'time to run' );

  axios.get(BASE_URL).then( (response) => {
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

    if(fs.existsSync(LAST_RUN_FILE)){

      fs.readFile(LAST_RUN_FILE, (err, data) => {
        if (err) throw err;

        data = JSON.parse(data);

        console.log('check strings');

        if( ( JSON.stringify(data) !== JSON.stringify(splits) )
          || true === DEBUG ){

            console.log('send sms');

            let latest = splits[splits.length-1];

            let message = latest.place +" (" +latest.desc +")";

            sendSMS(message);

            fs.writeFile(LAST_RUN_FILE, JSON.stringify(splits), (err) => {
              if (err) throw err;
            });

        }


       });

    }
    else {
        fs.writeFile(LAST_RUN_FILE, JSON.stringify([]), (err) => {
          if (err) throw err;
        });
    }


  });

}
else {
  console.log( 'not time to run' )
}
