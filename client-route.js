var express = require('express');
var router = express.Router();
var connection = require('./db.connection');
const authJwt = require('./auth/verifyToken');
var sendMessage = require('./email-sender');
const encryption = require("./encryption");
const accountSid = 'ACc4feaf5fb0340caa82fe8f39fe773b50';
const authToken = 'cbd279807600b6444a347685d87b3768';
const client = require('twilio')(accountSid, authToken);
const voiceMessage = require('./voice_mail');
const sendReport = require('./test');

// router.get("/message",async function(req,res){    
//     voiceMessage('fdtdf','dfdfd');
//     // client.messages
//     // .create({
//     //    body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
//     //    from: '+15595496128',
//     //    to: '+919667763450'
//     //  })
//     // .then(message => res.send(message.sid),err=>{
//     //     res.send("error"+err);
//     // });
// });

// router.get("/mail", async function(req,res){
//     let mailOptions = {
//         from: 'sandeepkr5495@gmail.com', // sender address
//         to: "shubhamrawat.140@gmail.com,sandeepkr5495@gmail.com", // list of receivers
//         subject: "Hello ✔", // Subject line
//         text: "Hello world?", // plain text body
//         html: "<b>Hello world?</b>" // html body
//       };
    
//       // send mail with defined transport object
//       sendMessage(mailOptions.to,mailOptions.subject,mailOptions.html,function(err,response){
//           if(err){
//             res.send(err);
//           }
//           else{
//             res.send("success");
//           }
//       });
// });

router.get("/", [authJwt.verifyToken], function (req, res) {
    let queryStr = 'select * from client_master';
    connection.query(queryStr, async function (err, rows) {
        if (err) {
            res.status(401).send({
                error: true,
                data: [],
                message: "No Client records Found"
            });
            return;
        }
        if(rows){
            rows = rows.filter(record=>{
                return req.type_of_user == 'CLIENT' ? record.user_name == req.username : record.admin_user_name == req.username
            });
            rows = rows.map(record=>{
                record.client_name = encryption.decrypt(record.client_name);
                record.phone_number = encryption.decrypt(record.phone_number);
                record.gst_number = encryption.decrypt(record.gst_number);
                record.representative_name = encryption.decrypt(record.representative_name);
                record.registration_details = encryption.decrypt(record.registration_details);
                return record;
            })
        }
        res.send({
            data: rows,
            message: 'successfully fetched client records'
        });
    });
});

router.delete("/:client_id", [authJwt.verifyToken], function (req, res) {
    const queryStr = 'select * from client_master where client_id=? and admin_user_name=?';
    console.log([req.params.client_id, req.username]);
    connection.query(queryStr, [req.params.client_id, req.username], async function (err, rows) {
        let record = rows[0];
        if (err || !record) {
            res.status(401).send({
                error: true,
                message: "No Client Found To Delete"
            });
            return;
        }
        const deleteQuery = `delete from client_master where client_id=?`;
        
        const clientUserName = record.email_address;
        connection.query(deleteQuery, [req.params.client_id], function (err, rows) {
            console.log(err);
            
            if (err) {
                res.status(401).send({
                    error: true,
                    message: "Can not delete Client"
                });
                return;
            }
            const deleteLoginQuery = `delete from login where username=?`;   
            connection.query(deleteLoginQuery, [clientUserName], function (err, rows) {
                if (err) {
                    res.status(401).send({
                        error: true,
                        message: 'Client Id Deletion failed'
                    });
                    return;
                }
                res.send({
                    message: 'Deleted client record'
                });
            });
        });
    });
});

router.get("/:client_id", [authJwt.verifyToken], function (req, res) {
    let queryStr = 'select * from client_master where client_id=? and admin_user_name=?';
    let data;
    console.log("type of user", req.type_of_user);
    if (req.type_of_user == 'CLIENT') {
        queryStr = 'select * from client_master where email_address=?';
        data =  [req.username];
        console.log("username",req.username);
    }
    else {
        queryStr = 'select * from client_master where client_id=? and admin_user_name=?';
        data =  [req.params.client_id, req.username];
    }
    connection.query(queryStr,data, async function (err, rows) {
        let record = rows[0];
        if (err || !record) {
            res.status(401).send({
                error: true,
                message: "No Client Details Found"
            });
            return;
        }
        let profile_id = record.profile_id;
        let document_id = record.document_id;
        let profile_data = null;
        let document_data = null;
        if (profile_id) {
            profile_data = await getDocument(profile_id);
            if (profile_data) {
                record.profile_pic = profile_data.file_data;
            }
        }
        if (document_id) {
            document_data = await getDocument(document_id);
            if (document_data) {
                record.document_file = document_data.file_data;
            }
        }
        if(record){
            record.client_name = encryption.decrypt(record.client_name);
            record.phone_number = encryption.decrypt(record.phone_number);
            record.gst_number = encryption.decrypt(record.gst_number);
            record.representative_name = encryption.decrypt(record.representative_name);
            record.registration_details = encryption.decrypt(record.registration_details);
        }
        res.send({
            data: record,
            message: 'successfully fetched records'
        });

    });
});

router.put("/:client_id", [authJwt.verifyToken], function (req, res) {
    
    let queryStr = 'select * from client_master where client_id=? and admin_user_name=?';
    if (req.type_of_user == 'CLIENT') {
        queryStr = 'select * from client_master where email_address=?';
        data =  [req.username];
        console.log("username",req.username);
    }
    else {
        queryStr = 'select * from client_master where client_id=? and admin_user_name=?';
        data =  [req.params.client_id, req.username];
    }
    connection.query(queryStr,data, async function (err, rows) {
        let record = rows[0];
        if (err || !record) {
            res.status(401).send({
                error: true,
                message: "Can't update client not found"
            });
            return;
        }
      let validClientId = record.client_id;
        ({ profile_pic, client_name, country_id, state_id, district_id,city_id, location_id, block_id, firm_type, gst_number, representative_name, representative_id, phone_number, email_address, registration_details } = req.body);
        if (!client_name || !country_id || !state_id || !city_id || !district_id ||
             !location_id || !block_id || !gst_number || !representative_name
            || !phone_number || !email_address || !registration_details || !firm_type) {
            res.status(401).send({
                error: true,
                message: "Please provide all fields !"
            });
            return;
        }
        if (!phone_number || phone_number.length != 10) {
            res.status(401).send({
                error: true,
                message: "Phone number not valid"
            });
            return;
        }
        if (!gst_number || gst_number.length != 15) {
            res.status(401).send({
                error: true,
                message: "GST number not valid"
            });
            return;
        }


        const insertRecordToClientMaster = "update client_master set ? where client_id=" + "'" + validClientId + "'";
        try {
            let data = null;
            let profile_id = null;
            if (req.body.profile_pic) {
                data = await insertDocument(req.body.profile_pic, 'profile_pic');
                if (data) {
                    profile_id = data.insertId;
                }
                else {
                    res.send({
                        error: true,
                        message: "Can't upload document"
                    });
                    return;
                }
            }

            data = null;
            let document_id = null;
            if (req.body.document_file) {
                data = await insertDocument(req.body.document_file, 'document_file');

                if (data) {
                    document_id = data.insertId;
                }
                else {
                    res.send({
                        error: true,
                        message: "Can't upload document"
                    });
                }
            }

            let dataToSave = {
                client_name:encryption.encrypt(client_name), country_id, state_id,district_id,
                city_id, location_id, block_id,
                gst_number:encryption.encrypt(gst_number), representative_name:encryption.encrypt(representative_name),
                representative_id, phone_number:encryption.encrypt(phone_number),
                registration_details:encryption.encrypt(registration_details),
                firm_type,
            }
            if (profile_id) {
                dataToSave.profile_id = profile_id;
            }
            if (document_id) {
                dataToSave.document_id = document_id;
            }
            connection.query(insertRecordToClientMaster,
                dataToSave, function (err, result) {
                    if (err) {

                        res.status(401).send({
                            error: true,
                            message: "Error updating client records."
                        });
                        return;
                    }
                    res.send({
                        message: 'Successfully updated Client Record'
                    });
                });

        }
        catch (e) {
            console.log(e);
            res.status(401).send({
                error: true,
                message: 'Internal Server Error'
            });
            return;
        }


    });


});

router.post("/", [authJwt.verifyToken], function (req, res) {

    // getDocument(req,res);
    ({ profile_pic, client_name, country_id, state_id,district_id, city_id, location_id, block_id, 
        firm_type, gst_number, representative_name, representative_id, phone_number, email_address, registration_details } = req.body);
    if (!client_name || !country_id || !state_id || !city_id
        || !location_id || !block_id || !gst_number || !representative_name
        || !phone_number || !email_address || !registration_details || !firm_type) {
        res.status(401).send({
            error: true,
            message: "Please provide all fields !"
        });
        return;
    }
    if (!phone_number || phone_number.length != 10) {
        res.status(401).send({
            error: true,
            message: "Phone number not valid"
        });
        return;
    }
    if (!gst_number || gst_number.length != 15) {
        res.status(401).send({
            error: true,
            message: "GST number not valid"
        });
        return;
    }
    //VALIDATING IF NOT ALREADY EMAIL OR PHONE
    var uniqueEmailAndPhoneNumber = 'select COUNT(*) AS count from client_master WHERE phone_number = ? or email_address = ?'
    connection.query(uniqueEmailAndPhoneNumber, [phone_number, email_address], function (err, rows) {
        if (err) {
            res.status(401).send({
                error: true,
                message: "Something Went Wrong!"
            });
            return;
        }
        const count = rows[0].count;
        if (count) {
            res.status(401).send({
                error: true,
                message: "Email or phone Number is already Registered."
            });
            return;
        }
        var loginUsrName = email_address;
        var loginUsrPwd = '';
        if (email_address.length >= 4) {
            loginUsrPwd = email_address.substr(0, 4);
        }
        else {
            loginUsrPwd = email_address.substr(0, email_address.length);
        }
        loginUsrPwd += phone_number.substr(0, 4);
        loginUsrPwd += ~~(Math.random() * 100);
        loginUsrPwd += ~~(Math.random() * 100);
        //MAKING ENTRY TO LOGIN TABLE FOR CLIENT LOGIN
        const loginEntry = "insert into login set ?";


        connection.query(loginEntry, {
            username: loginUsrName,
            password: loginUsrPwd,
            type_of_user: 'CLIENT',
            firstname: client_name,
            isActive: 'Y'
        }, async function (err, result) {

            if (err) {
                res.status(401).send({
                    error: true,
                    message: "Error inserting records.",
                    query:err
                });
                return;
            }

            const insertRecordToClientMaster = "insert into client_master set ?";
            try {
                let data = null;
                let profile_id = null;
                if (req.body.profile_pic) {
                    data = await insertDocument(req.body.profile_pic, 'profile_pic');
                    if (data) {
                        profile_id = data.insertId;
                    }
                    else {
                        res.send({
                            error: true,
                            message: "Can't upload document"
                        });
                    }
                }



                data = null;
                let document_id = null;
                if (req.body.document_file) {
                    data = await insertDocument(req.body.document_file, 'document_file');
                    if (data) {
                        document_id = data.insertId;
                    }
                    else {
                        res.send({
                            error: true,
                            message: "Can't upload document"
                        });
                    }
                }




                connection.query(insertRecordToClientMaster, {
                    client_name:encryption.encrypt(client_name), country_id, state_id,district_id,
                    city_id, location_id, block_id,
                    gst_number:encryption.encrypt(gst_number), representative_name:encryption.encrypt(representative_name),
                    representative_id, phone_number:encryption.encrypt(phone_number),
                    email_address, registration_details:encryption.encrypt(registration_details),
                    user_name: loginUsrName,
                    firm_type,
                    admin_user_name: req.username,
                    profile_id,
                    document_id
                }, async function (err, result) {
                    console.log(err);
                    if (err) {
                        connection.query('delete from login where username = ?', [loginUsrName], function (err, result) {

                            res.status(401).send({
                                error: true,
                                message: "Error inserting client records.",
                                query:err
                            });

                        });
                        return;
                    }

                    let mailOptions = {
                        from: 'sandeepkr5495@gmail.com', // sender address
                        to: `${email_address}`, // list of receivers
                        subject: "Welcome", // Subject line
                        text: "Welcome", // plain text body
                        html: `
                        Your user name is ${loginUsrName} and generated password is ${loginUsrPwd}
                        
                        ` // html body
                      };
                    console.log(mailOptions);
                      // send mail with defined transport object
                      try{
                        sendMessage(mailOptions.to,mailOptions.subject,mailOptions.html,function(err,response){
                            if(err){
                              res.send(err);
                            }
                            else{
                                res.send({
                                    message: 'Successfully added Client Record'
                                });
                            }
                        });
                      }
                      catch(e){
                        res.send(e);
                      }
                    
                    
                });

            }
            catch (e) {

                connection.query('delete from login where username = ?', [loginUsrName], function (err, result) {

                    res.status(401).send({
                        error: true,
                        message: e
                    });

                });
                return;
            }

            return;
        });

    });
});





function base64ToBuffr(base64String) {
    const buf = Buffer.from(base64String, 'ascii');
    return buf;
}


function bufferToBase64(buffer) {
    return Buffer.from(buffer, 'binary').toString('ascii');
}

async function getDocument(id) {
    const query = 'select * from base64_file where file_id = ' + id;
    let record = null;
    record = await new Promise((resolve, reject) => {
        connection.query(query, [], function (err, results) {
            let result = results[0]
            if (err || !result) {
                return null;
            }
            record = { file_name: result.file_name, file_type: result.file_type, file_id: result.file_id };
            record.file_data = bufferToBase64(result.file_data);
            resolve(record);
        });
    });
    return record;
}

async function insertDocument(base64String, file_name) {

    if (base64String) {
        // console.log(base64String);
        const buffer = base64ToBuffr(base64String);
        const query = 'insert into base64_file set ?';
        let file_type = 'test';
        let file_data = buffer;
        let data = null;
        try {
            file_type = base64String.split(";")[0].split(":")[1];
        }
        catch (e) {
            return null;
        }
        await new Promise((resolve, reject) => {
            connection.query(query, { file_name, file_type, file_data }, function (err, result) {
                if (err) {
                    resolve(null);
                }
                else {
                    data = result;
                    resolve(result);
                }
            });
        });

        return data;
    }
    return null;
}


module.exports = router;
