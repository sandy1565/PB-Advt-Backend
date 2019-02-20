var express = require('express');
var router = express.Router();
var connection = require('./db.connection');
const authJwt = require('./auth/verifyToken');

router.post("/", [authJwt.verifyToken],  function(req,res){
  
    // getDocument(req,res);
    ({profile_pic,client_name,country_id,state_id,city_id,location_id,block_id,firm_type,gst_number,representative_name,representative_id,phone_number,email_address,registration_details} = req.body);
    if(!client_name || !country_id || !state_id || !city_id
        || !location_id || !block_id || !gst_number || !representative_name
        || !phone_number || !email_address || !registration_details || !firm_type){
        res.status(201).send({
                error:true,
                message:"Please provide all fields !"
            });
        return;
    }
    if(!phone_number || phone_number.length != 10){
        res.status(201).send({
            error:true,
            message:"Phone number not valid"
        });
        return;
    }
    if(!gst_number || gst_number.length != 15){
        res.status(201).send({
            error:true,
            message:"GST number not valid"
        });
        return;
    }
    //VALIDATING IF NOT ALREADY EMAIL OR PHONE
    var uniqueEmailAndPhoneNumber = 'select COUNT(*) AS count from client_master WHERE phone_number = ? or email_address = ?'
    connection.query(uniqueEmailAndPhoneNumber, [phone_number,email_address], function (err, rows) {
        if(err){
            res.status(201).send({
                error:true,
                message:"Something Went Wrong!"
            });
            return;
        }
        const count = rows[0].count;
        if(count) {
            res.status(201).send({
                error:true,
                message:"Email or phone Number is already Registered."
            });
            return;
        }
        var loginUsrName = email_address;
        var loginUsrPwd  = '';
        if(email_address.length >= 4){
            loginUsrPwd = email_address.substr(0,4);
        }
        else{
            loginUsrPwd = email_address.substr(0,email_address.length);
        }
        loginUsrPwd += phone_number.substr(0,4);
        loginUsrPwd += ~~(Math.random()*100);
        loginUsrPwd += ~~(Math.random()*100);
        //MAKING ENTRY TO LOGIN TABLE FOR CLIENT LOGIN
        const loginEntry = "insert into login set ?";
     

        connection.query(loginEntry, {
            username:loginUsrName,
            password:loginUsrPwd,
            type_of_user:'CLIENT',
            firstname:client_name,
            isActive:'Y'
        }, async function(err, result) {
            console.log(err);
            if(err){
                res.status(201).send({
                    error:true,
                    message:"Error inserting records."
                });
                return;
            }

            const insertRecordToClientMaster = "insert into client_master set ?";
            try{
                let data =  await insertDocument(req.body.profile_pic,'profile_pic');
                let profile_id = null;
                if(data){
                   file_id = data.insertId;
                }
                else{
                    res.send({
                        error:true,
                        message:"Can't upload document"
                    });
                }

                data =  await insertDocument(req.body.profile_pic,'document_file');
                let document_id = null;
                if(data){
                    document_id = data.insertId;
                }
                else{
                    res.send({
                        error:true,
                        message:"Can't upload document"
                    });
                }

                
                connection.query(insertRecordToClientMaster, {client_name,country_id,state_id,
                    city_id,location_id,block_id,
                    gst_number,representative_name,
                    representative_id,phone_number,
                    email_address,registration_details,
                    user_name:loginUsrName,
                    firm_type,
                    admin_user_name:req.username,
                    profile_id,
                    document_id
                }, function(err, result) {
                    if(err){
                        connection.query('delete from login where username = ?',[loginUsrName],function(err,result){
    
                            res.status(201).send({
                                error:true,
                                message:"Error inserting client records."
                            });
    
                        });
                        return;
                    }
                    res.send({
                        message:'Successfully added Client Record'
                    });
                });
    
            }
            catch(e){
                console.log(e);
                
                connection.query('delete from login where username = ?',[loginUsrName],function(err,result){
    
                    res.status(201).send({
                        error:true,
                        message:e
                    });

                });
                return;
            }
            
            return;
        });




    });
});

router.post("/profile_pic",function(req,res){
    insertDocument(req.body.profile_pic,req,res);
});





function base64ToBuffr(base64String){
    const buf = Buffer.from(base64String, 'ascii');
    return buf;
}


function bufferToBase64(buffer){
    return Buffer.from(buffer,'binary').toString('ascii');
}

async function getDocument(req,res){
    const query = 'select * from base64_file where file_id = 3';
    let record = null;
    await connection.query(query,[],function(err,result){
        console.log("error",err);
        console.log("result", result);
        let record = result[0]
        if(err || !record){           
           return null;
        }
        record = {file_name:result.file_name,file_type:result.file_data,file_id:result.file_id};
        record.file_data = bufferToBase64(record.file_data);
    });
    return record;
}

async function insertDocument(base64String,file_name){
    console.log("filetye",file_name)
    if(base64String){
        // console.log(base64String);
        const buffer = base64ToBuffr(base64String);
        const query = 'insert into base64_file set ?';
        let file_type = 'test';
        let file_data = buffer;
        let data = null;
        try{
            file_type = base64String.split(";")[0].split(":")[1];
        }
        catch(e){
            return null;
        }
        await new Promise((resolve,reject)=>{
            connection.query(query,{file_name,file_type,file_data},function(err,result){
                if(err){                
                    resolve(null);
                }
                else{
                    data = result;
                    resolve(result);
                }             
            });
        });

        return data;
    }
    return null;
}


module.exports =  router;
