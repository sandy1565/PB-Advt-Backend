"use strict";
const nodemailer = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport');
// async..await is not allowed in global scope, must use a wrapper
async function main(){
    // let transporter = nodemailer.createTransport({
    //     host: 'smtp.gmail.com',
    //     port: 587,
    //     secure: false,
    //     auth: {
    //         user: "sandeepkr5495@gmail.com", // generated ethereal user
    //         pass: "Bcse1565"  // generated ethereal password
    //     }
        
    // });
    
    
    
    //  transporter.sendMail({
    //     from: 'sandeepkr5495@gmail.com',
    //     to: 'shubhamrawat.140@gmail.com',
    //     subject: 'Message',
    //     text: 'I hope this message gets through!',
    // },function(args){
    //     console.log(args);
    // });
    var transport = nodemailer.createTransport(smtpTransport({
        service: 'gmail',
        auth: {
            user: "sandeepkr5495@gmail.com", // generated ethereal user
            pass: "Bcse1565"  // generated ethereal password
        }
    }));

    // let transporter = nodemailer.createTransport({
    //     host: "smtp.gmail.com",
    //     port: 465,
    //     secure: true, // true for 465, false for other ports
    //     auth: {
    //         user: "sandeepkr5495@gmail.com", // generated ethereal user
    //         pass: "Bcse1565"  // generated ethereal password
    //     }
    //   });

    module.exports = transporter;
    

    

}

main().catch(console.error);



