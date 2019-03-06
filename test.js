
// const encryption = require('./encryption');
// console.log(encryption.encrypt("9810880786"));


// const FBMessenger = require('fb-messenger')
// const messenger = new FBMessenger({token: 'EAAg1uqRsszoBAErO1ig2ZCDPRbYUZAZBkGwzK0bm6GCTRXABDUNwV4u3fPvZCpyDbHOR2AEupwbV5PLbJlh3CCfUbqeUk8UUtTkDo2wBAobepCcDbGzYMGTUQuu3yuOSP3iUuCtMl9PsJdLV4es3bNtk6riWmu6xXJABBxGj8HsPpEkGEw1Eg4ilpsliu5wZD', notificationType: 'NO_PUSH'})
// async function c(){

//     try {
//         await messenger.sendTextMessage({id: '100003196867041', text: 'Hello'}) // Send a message with NO_PUSH, ignoring response
//         console.log('Sent successfully')
//       } catch(e) {
//         console.error(e)
//       }
// }
// c();
 
// messenger.sendTextMessage({id: '100003196867041', text: 'Hello', notificationType: 'NO_PUSH',token: 'EAAg1uqRsszoBAErO1ig2ZCDPRbYUZAZBkGwzK0bm6GCTRXABDUNwV4u3fPvZCpyDbHOR2AEupwbV5PLbJlh3CCfUbqeUk8UUtTkDo2wBAobepCcDbGzYMGTUQuu3yuOSP3iUuCtMl9PsJdLV4es3bNtk6riWmu6xXJABBxGj8HsPpEkGEw1Eg4ilpsliu5wZD'})


const https = require('https');
let key = "zSV/NUQAFIY-KQEU5YXtBLxotUkoZVK6H4l89ZREt6";
function sendSMS(numbers,message,callback){
  https.get(`https://api.textlocal.in/send?apikey=${key}&numbers=${numbers}&message=${encodeURIComponent(message)}`,function(err,res){
  if(callback){
    callback(res);
  }
  });
  
}

// sendSMS("919667763450","Hi");