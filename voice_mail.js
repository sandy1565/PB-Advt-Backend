const Nexmo = require('nexmo');
const path = require('path');
const nexmo = new Nexmo({
    apiKey: "8f80aaeb",
    apiSecret: "x2BNhk3TMiRbVW89",
    applicationId: "22b51729-11b1-40f0-baef-dc23ab6bab3b",
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
        answer_url: ["http://localhost:3001"]
      }, function(err,data){
          console.log("restponse ",arguments);
          let pathVoice = path.join(path.dirname(require.main.filename) ,"public/test.mp3");
          console.log("dfdfd",pathVoice );
        nexmo.calls.stream.start(
            data.uuid,
            {
              stream_url: [
               path.join(pathVoice)
              ],
              loop: 1
            });
      });
  
  }