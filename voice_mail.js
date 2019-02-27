const Nexmo = require('nexmo');
const path = require('path');
const nexmo = new Nexmo({
    apiKey: "8f80aaeb",
    apiSecret: "x2BNhk3TMiRbVW89",
    applicationId: "b1ea4980-39d2-4ce4-b9f5-9a73b23f8a11",
    privateKey: "./private.key",
  });


 module.exports =  function makeCall(phone_number,voicePath){
    nexmo.calls.create({
        to: [{
          type: 'phone',
          number: '919667763450'
        }],
        from: {
          type: 'phone',
          number: "7289988810"
        },
        ncco:
          [
            {
              "action": "stream",
              "streamUrl": ["https://publishadvertisement.herokuapp.com/public/test.mp3"]
            }
          ]
        
      }, function(err,data){
      //   console.log(JSON.stringify(err));
      //     console.log("restponse ",arguments);
      //     let pathVoice = "https://publishadvertisement.herokuapp.com/public/test.mp3";
      //     console.log("dfdfd","https://publishadvertisement.herokuapp.com/public/test.mp3" );
      //   nexmo.calls.stream.start(
      //       data.uuid,
      //       {
      //         stream_url: [
      //         pathVoice
      //         ],
      //         loop: 1
      //       },function(err,data){
      //         console.log(err,data);
      //       });
      });
  
  }