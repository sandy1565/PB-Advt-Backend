const fs = require('fs');
const path = require('path');
test();
function test(){
    let d = new Date();
    let fileExt = ".mp3";
    let name = 'TESTTEST';
    let fileName = path.join(__dirname,"/"+name+d.getTime()+Math.floor(Math.random()*1000)+fileExt);
    let data = fs.readFileSync("./song.txt");
    console.log("data",data);
    let base64String = data.toString("ascii");
    
    let dataBytes = Buffer.from(base64String,'base64');
    console.log("data aSC",dataBytes);
    fs.writeFile(fileName,dataBytes , function(err) {
        if(err) {
            console.log("err",err);
        } else {
            console.log("sucess");
        }
    });
}

function saveToDisc(name,fileExt,base64String, callback){
    let fileName = path.join(__dirname,"/"+name+d.getTime()+Math.floor(Math.random()*1000)+fileExt);
    let dataBytes = Buffer.from(base64String,'base64');
    console.log("data aSC",dataBytes);
    fs.writeFile(fileName,dataBytes , function(err) {
        if(err) {
            callback(err);
        } else {
            callback(null,fileName);
        }
    });
}