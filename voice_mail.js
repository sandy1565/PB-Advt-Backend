const Nexmo = require('nexmo');
const path = require('path');
const nexmo = new Nexmo({
    apiKey: "8f80aaeb",
    apiSecret: "x2BNhk3TMiRbVW89",
    applicationId: "b1ea4980-39d2-4ce4-b9f5-9a73b23f8a11",
    privateKey: "./private.key",
  });

 module.exports =  function makeCall(phone_number,voicePath, callback){
    
  nexmo.calls.create({
        to: [{
          type: 'phone',
          number: "91"+phone_number
        }],
        from: {
          type: 'phone',
          number: "917289988810"
        },
        ncco:
          [
            {
              "action": "stream",
              "streamUrl": ["https://publishadvertisement.herokuapp.com"+voicePath]
            }
          ]
        
      }, function(err,data){
      //  console.log("VOICE *************");
      //  console.log(err,"https://publishadvertisement.herokuapp.com"+voicePath);
      //  console.log(data); 
        callback(err,data);
      });
  
  }