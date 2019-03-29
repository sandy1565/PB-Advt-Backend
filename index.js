var connection = require('./db.connection');
const express = require('express');
var app = express();
var cors = require('cors');
var sendMessage = require('./email-sender');
var bodyParser = require('body-parser');
const encryption = require('./encryption');

var jwt = require('jsonwebtoken');
const config = require('./config');
const authJwt = require('./auth/verifyToken');
var clientRouter = require('./client-route');
var cron = require('node-cron');
const accountSid = 'ACc4feaf5fb0340caa82fe8f39fe773b50';
const authToken = 'cbd279807600b6444a347685d87b3768';
const client = require('twilio')(accountSid, authToken);
const logger = require('./logger');
const path = require('path');
const fs = require('fs');
const voiceMessage = require('./voice_mail');
const publish = require('./advert_publish');
console.log(path.join(__dirname, 'public'));
//setting middleware
// app.use(express.static(path.join(__dirname,'public')));
app.use('/public', express.static(path.resolve(__dirname, 'public')));
// app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());
var urlencodedParser = bodyParser.urlencoded({ extended: false, parameterLimit: 100000, limit: '10mb' });
app.use(bodyParser.json({ limit: '10mb' }));
cronJob('0 19 15 * * *');


function cronJob(timePattern) {
    cron.schedule(timePattern, () => {
        const allAdvrtQuery = `select * from advt_master inner join  client_master on  client_master.client_id = advt_master.client_id`;

        console.log("started")
        let today = getIndianTime();
        connection.query(allAdvrtQuery, function (err, results) {
            if (err || !results[0]) {
                console.log(err, results);
                return;
            }
            // console.log("results",results)
            console.log("all advts found ", results.length);
            let allAdverts = results;
            const personsQuery = `select *, DATE_FORMAT(NOW(), '%Y') - DATE_FORMAT(date_of_birth, '%Y') - (DATE_FORMAT(NOW(), '00-%m-%d') < DATE_FORMAT(date_of_birth, '00-%m-%d')) AS age  from person_master`;
            connection.query(personsQuery, function (err, results) {
                if (err || !results[0]) {
                    console.log("2", err);
                    return;
                }
                let allPersons = results;

                console.log("all persons found ", results.length);
                // console.log(allPersons);
                allAdverts.forEach(advert => {
                    // if(advert.status == 'unapproved'){
                    //     return;
                    // }
                    const ftchPubDts = 'select *, CONVERT_TZ(from_publish_date,\'+00:00\',\'+05:30\') as from_publish_date,  CONVERT_TZ(to_publish_date,\'+00:00\',\'+05:30\') as to_publish_date from PUBLISH_DATE where advt_id = ?';
                     connection.query(ftchPubDts, [advert.advt_id], function (err, rows) {
                        console.log(err,rows);
                   
                        if (err || !rows || !rows[0]) {
                            
                            return;
                        }
                        rows.forEach(row => {
                            if(row.status == 'published'){
                                return;
                            }
                           
                            let fromPublishDate = new Date(row.from_publish_date);
                            let toPublishDate = new Date(row.to_publish_date);
                            console.log(fromPublishDate,toPublishDate);
                            let allEmails = [];
                            console.log("fromPublishDate",fromPublishDate);
                            console.log("toPublishDate",toPublishDate);
                            console.log("today",fromPublishDate.getMinutes(),today.getMinutes(),
                            );
                            console.log(fromPublishDate.getDate() == today.getDate() ,
                            fromPublishDate.getMonth() == today.getMonth() ,
                            fromPublishDate.getFullYear() == today.getFullYear() ,
                            ((fromPublishDate.getHours() <= today.getHours() && 
                            toPublishDate.getHours() >= today.getHours()) ?true: 
                            (fromPublishDate.getMinutes() <= today.getMinutes()&&
                            toPublishDate.getMinutes() >= today.getMinutes())));

                            if (fromPublishDate.getDate() == today.getDate() &&
                            fromPublishDate.getMonth() == today.getMonth() &&
                            fromPublishDate.getFullYear() == today.getFullYear() &&
                            ((fromPublishDate.getHours() <= today.getHours() && 
                            toPublishDate.getHours() >= today.getHours()) ?true: (fromPublishDate.getMinutes() <= today.getMinutes() && 
                            toPublishDate.getMinutes() >= today.getMinutes())
                            )) {
                                connection.query("update  PUBLISH_DATE set status = ? where advt_id = ?", 
                                ['published',advert.advt_id],function(){
    
                                });
                                console.log("allPersons",allPersons.length);
                                console.log("advert",advert);
                                let selectedPersons = allPersons.filter(person => {
                                    if(person.firstname == "test"){
                                        console.log("blockids",advert.block_ids.split(","),person.block_id);
                                        console.log("locationids",advert.location_ids.split(","),person.location_id);
                                        console.log("age",person.age,advert.age_from,advert.age_to );
                                    }
                                    return (
                                        advert.block_ids.split(",").map(n=>+n).includes(+person.block_id)
                                        && advert.location_ids.split(",").map(n=>+n).includes(+person.location_id)
                                        && (advert.age_from ?advert.age_from <= person.age:true) &&
                                        (advert.age_to ? person.age <= advert.age_to :true)
                                    );
                                });
                                console.log("selectedPersons",selectedPersons);
                                selectedPersons.forEach(person => {

                                    if (person.mobile_number1 && advert.type.includes("voice")) {

                                        let phone_number = encryption.decrypt(person.mobile_number1);
                                        voiceMessage(phone_number, advert.voiceFile, function (err, data) {
                                            let log_query = `insert into advt_publish_log set ?`;
                                            console.log(JSON.stringify(err));
                                            // console.log("*******************",advert);
                                            let obj = {
                                                advt_id: advert.advt_id,
                                                client_user_name: advert.user_name,
                                                admin_user_name: advert.admin_user_name,
                                                subject: encryption.decrypt(advert.advt_subject),
                                                message: encryption.decrypt(advert.advt_details),
                                                from_publish_date:fromPublishDate.toISOString(),
                                                to_publish_date:toPublishDate.toISOString(),
                                                type: 'voice'
                                            };
                                            let phone_number = encryption.decrypt(person.mobile_number1);
                                            obj.phone_number = '+91' + phone_number;

                                            let status = "success";
                                            if (err) {
                                                status = "failure";
                                            }

                                            obj.status = status;
                                            connection.query(log_query, obj, function (err) {

                                            });

                                        });
                                    }
                                    if (person.mobile_number1 && advert.type.includes("message")) {
                                        const log_query = `insert into advt_publish_log set ?`;
                                        // console.log("*******************",advert);
                                        let obj = {
                                            advt_id: advert.advt_id,
                                            client_user_name: advert.user_name,
                                            admin_user_name: advert.admin_user_name,
                                            subject: encryption.decrypt(advert.advt_subject),
                                            message: encryption.decrypt(advert.advt_details),
                                            from_publish_date:fromPublishDate.toISOString(),
                                            to_publish_date:toPublishDate.toISOString(),
                                            type: 'message'
                                        };
                                        let phone_number = encryption.decrypt(person.mobile_number1);
                                        obj.phone_number = '+91' + phone_number;

                                        client.messages.create({
                                            body: encryption.decrypt(advert.advt_details),
                                            from: '+15595496128',
                                            to: '+91' + phone_number
                                        })
                                            .then(message => {

                                                // console.log("************************",message);
                                                obj.status = 'success';
                                                connection.query(log_query, obj, function (err) {

                                                });
                                            }, err => {
                                                console.log("************************ERRRR", err);
                                                obj.status = 'failure';
                                                connection.query(log_query, obj, function (err) {

                                                });
                                            });
                                    }
                                    if (person.email_id) {
                                        allEmails.push(person.email_id);
                                    }
                                });
                                connection.query('update advt_master set status = ? where advt_id = ?', ['published', advert.advt_id]);
                                console.log("selected persons length for id " + advert.advt_id + " is " + selectedPersons.length, allEmails);
                                if (allEmails.length && advert.type.includes("email")) {
                                    sendMessage(allEmails.join(","), encryption.decrypt(advert.advt_subject),
                                        encryption.decrypt(advert.advt_details), function (err) {
                                            let status = 'success';
                                            if (err) {
                                                status = 'failure';
                                                console.log("error for advt " + advert.advt_id);

                                            }
                                            let advert_id = advert.advt_id;
                                            if (status == 'success') {
                                                // connection.query('update advt_master set status = ? where advt_id = ?',['published',advert_id]);
                                                console.log("SENT MESSAGES");
                                            }
                                            const log_query = `insert into advt_publish_log set ?`;
                                            let obj = {
                                                advt_id: advert.advt_id,
                                                client_user_name: advert.user_name,
                                                admin_user_name: advert.admin_user_name,
                                                subject: encryption.decrypt(advert.advt_subject),
                                                message: encryption.decrypt(advert.advt_details),
                                                from_publish_date:fromPublishDate.toISOString(),
                                                to_publish_date:toPublishDate.toISOString(),
                                                type: 'email'
                                            };
                                            allEmails.forEach((email_address) => {
                                                obj.person_email_address = email_address;
                                                obj.status = 'success';
                                                connection.query(log_query, obj, function (err) {
                                                    if (err) {
                                                        console.log(err);
                                                    }
                                                });
                                            });
                                        });
                                }
                            }
                        });
                    });


                });
            });
        });
    }, {
            scheduled: true,
            timezone: "Asia/Kolkata"
        });
}

connection.connect((err) => {
    if (err) {
        // throw err;
    }
    ////console.log("connected");
})



app.use(function (req, res, next) {
    // Website you wish to allow to connectcxc
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});


app.use(function (req, res, next) {
    console.log(req.url);
    next();
})

var PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(process.env.PORT);
    ////console.log('Server is running on ',PORT);
})

app.get('/', (req, res) => {
    res.send('Welcome to Advertisement publish')
})

app.get('/createdb', (req, res) => {
    let sql = 'create database form';
    connection.query(sql, (err, res) => {
        if (err) {
            throw err;
        }
        ////console.log(res);
        res.send('database created');
    })
});


//////////////////get block ///////////////////////////
app.get('/api/getBlock', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from block_master', (err, rows) => {
        if (err) throw err;
        else {
            res.json(rows);
        }
    })
});

app.delete("/api/block/:id",[authJwt.verifyToken],(req,res) => {
    connection.query("delete from block_master where block_id = ?",[req.params.id],function(err,rows){
        if(err){
            return res.status(401).send({message:"Can not delete record."});
        }
        return res.send({message:'Deleted record'});
    });
});

app.post("/api/block",[authJwt.verifyToken],(req,res) => {       
        let body = {
            blockname:req.body.blockname,
            username:req.username
        }
        connection.query("insert into block_master set ? ",body,function(err,rows){
            if(err){
                return res.status(401).send({message:'Not Inserted block record',err});
            }
            else{
                return res.send({message:'Added Records',block_id:rows.insertId});
            }
        });
});


app.put('/api/block/:id',[authJwt.verifyToken],(req,res) => {

    connection.query("update block_master SET blockname = ? where block_id = ?",[req.body.blockname,req.params.id],
    function(err,rows){
        if(err){
            return res.status(401).send({message:'Record Not inserted',err});
        }
        else{
            return res.send({message:'Update block records'});
        }
    });
});

////////////////// get location ///////////////////////

app.post('/api/getLocation', [authJwt.verifyToken], (req, res) => {
    var locationData = {
        country_id: req.selectedCountry,
        state_id: req.selectedState,
        city_id: req.selectedCity
    }
    var location = req.get("locationData");
    ////console.log("--------req.body.country_id---------- ", req.body.country_id);
    ////console.log("---------req.body.city_id---------- ", req.body.city_id);
    ////console.log("-----------req.body.state_id-------- ", req.body.state_id);
    //////console.log("-----------req.body.country_id", country_id);

    var query = "";
    if (req.body.country_id != null && req.body.country_id != ""
        && req.body.country_id != "undefined" && req.body.city_id != null && req.body.city_id != ""
        && req.body.city_id != "undefined" && req.body.state_id != null &&
        req.body.state_id != "" && req.body.state_id != "undefined") {
        ////console.log("----------- ifffffffffffffffffffffff");
        query = " select * from greattug_advt_publish.location_master where country_id =" + req.body.country_id + " and state_id=" + req.body.state_id + " and city_id=" + req.body.city_id;

        ////console.log("query-------------", query);
    }
    if (query != "") {
        connection.query(query, (err, result) => {
            if (err) throw err;
            else {
                res.json(result);
                ////console.log(result)
            }
        })

    } else {
        ////console.log("error===>",err)
        res.json({
            status: 400,
            message: "There is no location specified for specified/selected country, state and city"
        })

    }
    // ////console.log("location ====================",result);
    // connection.query('select * from location_master where country_id=? && state_id= ? && city_id= ?'
});

// get Country Details
app.get('/api/getCountryDetails', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from country_master', (err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // ////console.log(result)
    })
});

app.delete("/api/country/:id",[authJwt.verifyToken],(req,res) => {
    connection.query("delete from country_master where country_id = ?",[req.params.id],function(err,rows){
        if(err){
            return res.status(401).send({message:"Can not delete record."});
        }
        return res.send({message:'Deleted record'});
    });
});

app.post("/api/country",[authJwt.verifyToken],(req,res) => {    
    connection.query("select max(country_id) as country_id from country_master",function(err,row){       
        if(err || !row[0]){
            return res.status(401).send({message:'Not Inserted country record'});
        }
        let body = {
            country_name:req.body.country_name,
            counrty_code:req.body.counrty_code,
            country_id:row[0].country_id+1
        }
        connection.query("insert into country_master set ?",body,function(err,rows){
            if(err){
                return res.status(401).send({message:'Not Inserted country record',err});
            }
            else{
                return res.send({message:'Added Records',country_id:body.country_id});
            }
        });
    });
  
});

app.put('/api/country/:id',[authJwt.verifyToken],(req,res) => {

    connection.query("update country_master SET country_name = ?, counrty_code = ? where country_id = ?",[req.body.country_name,req.body.counrty_code,req.params.id],
    function(err,rows){
        if(err){
            return res.status(401).send({message:'Record Not inserted',err});
        }
        else{
            return res.send({message:'Update country records'});
        }
    });
});

// get State
app.get('/api/getState', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from state_master', (err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // ////console.log(result)
    })
});

/* state master */

app.get('/api/getState/:id', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from state_master where country_id = ?',[req.params.id], (err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // ////console.log(result)
    })
});

app.delete("/api/state/:id",[authJwt.verifyToken],(req,res) => {
    connection.query("delete from state_master where state_id = ?",[req.params.id],function(err,rows){
        if(err){
            return res.status(401).send({message:"Can not delete record."});
        }
        return res.send({message:'Deleted record'});
    });
});

app.post("/api/state",[authJwt.verifyToken],(req,res) => {    
       let body = {
            statename:req.body.statename,
            country_id: req.body.country_id
        }
        connection.query("insert into state_master set ? ",body,function(err,rows){
            if(err){
                return res.status(401).send({message:'Not Inserted state record',err});
            }
            else{
                return res.send({message:'Added Records',state_id:rows.insertId});
            }
        });
});

app.put('/api/state/:id',[authJwt.verifyToken],(req,res) => {

    connection.query("update state_master SET statename = ? where state_id = ?",[req.body.state_name,req.params.id],
    function(err,rows){
        if(err){
            return res.status(401).send({message:'Record Not inserted',err});
        }
        else{
            return res.send({message:'Update state records'});
        }
    });
});

// get District
app.get('/api/district', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from district_master',(err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // ////console.log(result)
    })
});
// get District
app.get('/api/district/:id', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from district_master where state_id = ?',[req.params.id],(err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // ////console.log(result)
    })
});

app.post("/api/district",[authJwt.verifyToken],(req,res) => {    
    let body = {
         district_name:req.body.district_name,
         state_id: req.body.state_id
     };
     connection.query("insert into district_master set ? ",body,function(err,rows){
         if(err){
             return res.status(401).send({message:'Not Inserted district record',err});
         }
         else{
             return res.send({message:'Added Records',district_id:rows.insertId});
         }
     });
});

app.delete("/api/district/:id",[authJwt.verifyToken],(req,res) => {
    connection.query("delete from district_master where district_id = ?",[req.params.id],function(err,rows){
        if(err){
            return res.status(401).send({message:"Can not delete record."});
        }
        return res.send({message:'Deleted record'});
    });
});

app.put('/api/district/:id',[authJwt.verifyToken],(req,res) => {

    connection.query("update district_master SET district_name = ? where district_id = ?",[req.body.district_name,req.params.id],
    function(err,rows){
        if(err){
            return res.status(401).send({message:'Record Not inserted',err});
        }
        else{
            return res.send({message:'Update district records'});
        }
    });
});



// get city
app.get('/api/getCities', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from city_master', (err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // ////console.log(result)
    })
})

// get city
app.get('/api/getCities/:id', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from city_master where district_id = ?',[req.params.id], (err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // ////console.log(result)
    })
})

app.delete("/api/city/:id",[authJwt.verifyToken],(req,res) => {
    connection.query("delete from city_master where city_id = ?",[req.params.id],function(err,rows){
        if(err){
            return res.status(401).send({message:"Can not delete record."});
        }
        return res.send({message:'Deleted record'});
    });
});

app.post("/api/city",[authJwt.verifyToken],(req,res) => {       
        let body = {
            cityname:req.body.cityname,
            district_id:req.body.district_id,
            username:req.username
        }
        connection.query("insert into city_master set ? ",body,function(err,rows){
            if(err){
                return res.status(401).send({message:'Not Inserted city record',err});
            }
            else{
                return res.send({message:'Added Records',city_id:rows.insertId});
            }
        });
});


app.put('/api/city/:id',[authJwt.verifyToken],(req,res) => {

    connection.query("update city_master SET cityname = ? where city_id = ?",[req.body.cityname,req.params.id],
    function(err,rows){
        if(err){
            return res.status(401).send({message:'Record Not inserted',err});
        }
        else{
            return res.send({message:'Update city records'});
        }
    });
});




/* get location */
app.get('/api/getLocation', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from location_master', (err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // ////console.log(result)
    })
})

// get location
app.get('/api/getLocation/:id', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from location_master where city_id = ?',[req.params.id], (err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // ////console.log(result)
    })
});

app.delete("/api/location/:id",[authJwt.verifyToken],(req,res) => {
    connection.query("delete from location_master where location_id = ?",[req.params.id],function(err,rows){
        if(err){
            return res.status(401).send({message:"Can not delete record."});
        }
        return res.send({message:'Deleted record'});
    });
});

app.post("/api/location",[authJwt.verifyToken],(req,res) => {    
    connection.query("select max(location_id) as location_id from location_master",function(err,row){       
        if(err || !row[0]){
            return res.status(401).send({message:'Not Inserted lcoation record 1'});
        }
        let body = {
            location_name:req.body.location_name,
            country_id:req.body.country_id,
            state_id:req.body.state_id,
            city_id:req.body.city_id,
            location_id:row[0].location_id+1,
            username:req.username
        }
        connection.query("insert into location_master set ? ",body,function(err,rows){
            if(err){
                return res.status(401).send({message:'Not Inserted location record',err});
            }
            else{
                return res.send({message:'Added Records',location_id:body.location_id});
            }
        });
    });
  
});

app.put('/api/location/:id',[authJwt.verifyToken],(req,res) => {

    connection.query("update location_master SET location_name = ? where location_id = ?",[req.body.location_name,req.params.id],
    function(err,rows){
        if(err){
            return res.status(401).send({message:'Record Not inserted',err});
        }
        else{
            return res.send({message:'Update location records'});
        }
    });
});

////////////////////get floor ////////////////////////

app.get('/api/getFloor', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from floor_master', (err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // ////console.log(result)
    })
});

app.delete("/api/floor/:id",[authJwt.verifyToken],(req,res) => {
    connection.query("delete from floor_master where floor_id = ?",[req.params.id],function(err,rows){
        if(err){
            return res.status(401).send({message:"Can not delete record."});
        }
        return res.send({message:'Deleted record'});
    });
});

app.post("/api/floor",[authJwt.verifyToken],(req,res) => {    
    connection.query("select max(floor_id) as floor_id from floor_master",function(err,row){       
        if(err || !row[0]){
            return res.status(401).send({message:'Not Inserted floor record'});
        }
        let body = {
            floor_type:req.body.floor_type,
            floor_id:row[0].floor_id+1,
            username:req.username
        }
        connection.query("insert into floor_master set ? ",body,function(err,rows){
            if(err){
                return res.status(401).send({message:'Not Inserted floor record',err});
            }
            else{
                return res.send({message:'Added Records',floor_id:body.floor_id});
            }
        });
    });
  
});

app.put('/api/floor/:id',[authJwt.verifyToken],(req,res) => {

    connection.query("update floor_master SET floor_type = ? where floor_id = ?",[req.body.floor_type,req.params.id],
    function(err,rows){
        if(err){
            return res.status(401).send({message:'Record Not inserted',err});
        }
        else{
            return res.send({message:'Update floor records'});
        }
    });
});




// Get all person 
app.get('/api/getPerson', [authJwt.verifyToken], (req, res) => {
    connection.query(`SELECT *, DATE_FORMAT(date_of_birth, "%d %m %Y") as date_of_birth, DATE_FORMAT(NOW(), '%Y') - DATE_FORMAT(date_of_birth, '%Y') - (DATE_FORMAT(NOW(), '00-%m-%d') < DATE_FORMAT(date_of_birth, '00-%m-%d')) AS age FROM greattug_advt_publish.person_master`, (err, result) => {
        if (err) throw err;
        else {
            const resArr = [];
            result.map(item => {
                console.log(item.firstname);
                item.firstname = encryption.decrypt((item.firstname).toString());
                item.middlename = item.middlename ? encryption.decrypt(item.middlename) : item.middlename,
                item.lastname = item.lastname?encryption.decrypt(item.lastname):item.lastname;
                item.address = item.address?encryption.decrypt(item.address):item.address;
                item.gender = encryption.decrypt(item.gender);
                item.mobile_number1 = encryption.decrypt(item.mobile_number1);
                item.mobile_number2 = item.mobile_number2?encryption.decrypt(item.mobile_number2):'';
                resArr.push(item);
            });
            res.json(resArr);
        }
    });
});

/* get Person AS PER person_id*/
app.get('/api/getPersonData/:id', [authJwt.verifyToken], (req, res) => {
    connection.query(`select *, DATE_FORMAT(date_of_birth, "%Y-%m-%d") as date_of_birth, DATE_FORMAT(NOW(), '%Y') - DATE_FORMAT(date_of_birth, '%Y') - (DATE_FORMAT(NOW(), '00-%m-%d') < DATE_FORMAT(date_of_birth, '00-%m-%d')) AS age from person_master where person_master.person_id = ?`, [req.params.id], (err, result) => {
        if (err) throw err;
        else {
            let data;
            if (result[0]) {
                data = result[0];
                data.firstname = encryption.decrypt(data.firstname);
                data.middlename = data.middlename ? encryption.decrypt(data.middlename) : data.middlename,
                data.lastname = data.lastname ? encryption.decrypt(data.lastname) : data.lastname;
                data.address = data.address?encryption.decrypt(data.address):data.address;
                data.gender = encryption.decrypt(data.gender);
                data.mobile_number1 = encryption.decrypt(data.mobile_number1);
                data.mobile_number2 = data.mobile_number2?encryption.decrypt(data.mobile_number2):'';
            }
            res.json(
                { data })
        }
    })
});

///////////////// post person ///////////////////

app.post('/api/advtPerson', [authJwt.verifyToken], urlencodedParser, function (req, res) {
    var personDetails = {
        firstname: encryption.encrypt(req.body.firstname),
        middlename: req.body.middlename ? encryption.encrypt(req.body.middlename) : req.body.middlename,
        lastname: req.body.lastname? encryption.encrypt(req.body.lastname) : req.body.lastname,
        country_id: req.body.country_id,
        state_id: req.body.state_id,
        district_id: req.body.district_id,
        city_id: req.body.city_id,
        block_id: req.body.block_id,
        address: req.body.address?encryption.encrypt(req.body.address):req.body.address,
        location_id: req.body.location_id,               
        gender: encryption.encrypt(req.body.gender),
        mobile_number1: encryption.encrypt(req.body.mobile_number1),
        mobile_number2: req.body.mobile_number2?encryption.encrypt(req.body.mobile_number2):'',
        username: req.username,       
        creation_date: req.body.creation_date
    }

    if(req.body.floor_id){
        personDetails.floor_id = req.body.floor_id;
    }
    if(req.body.pincode){
        personDetails.pincode = req.body.pincode;
    }
    if(req.body.email_id){
        personDetails.email_id = req.body.email_id;
    }

    if(req.body.date_of_birth){
        personDetails.date_of_birth = req.body.date_of_birth;
    }

    var mobileNumberValidation = 'select COUNT(*) AS count from person_master WHERE mobile_number1 = ?'
    connection.query(mobileNumberValidation, [personDetails.mobile_number1], function (err, rows) {
        ////console.log(rows);
        const count = rows[0].count;
        ////console.log(count);        
        if (count > 0) {
            res.status(401).json({
                status: 401,
                message: "Given Mobile Number is Registered. Please provide another number."
            });
            ////console.log("Please Provide another number");
        }
        else {
            connection.query("INSERT INTO person_master SET ?", personDetails, function (err, result) {
                if (err) {
                    res.status(401).json({
                        message: err
                    })
                }
                else {
                    res.json({
                        status: 200,
                        message: "success"
                    });
                }
            });
        }
        // res.send(this.firstname);
    });
});

///////update person//////////////

app.put('/api/updatePerson/:person_id', [authJwt.verifyToken], urlencodedParser, function (req, res) {
    var query = `update person_master SET 
    firstname=?,
    middlename=?,
    lastname=?,
    country_id=?,
    state_id=?,
    district_id=?,
    city_id=?,
    location_id=?,
    block_id=?,
    floor_id=?,
    address=?,
    pincode=?,
    date_of_birth=?,
    gender=?,
    mobile_number1=?,
    mobile_number2=? WHERE person_id=?`;
    ////console.log('query --- ', query);
    connection.query(query, [
        encryption.encrypt(req.body.firstname),
        req.body.middlename ? encryption.encrypt(req.body.middlename) : req.body.middlename,
        req.body.lastname ? encryption.encrypt(req.body.lastname): req.body.lastname,
        req.body.country_id,
        req.body.state_id,
        req.body.district_id,
        req.body.city_id,
        req.body.location_id,
        req.body.block_id,
        req.body.floor_id,
        encryption.encrypt(req.body.address),
        req.body.pincode,
        req.body.date_of_birth,
        encryption.encrypt(req.body.gender),
        encryption.encrypt(req.body.mobile_number1),
        req.body.mobile_number2?encryption.encrypt(req.body.mobile_number2):'',
        req.params.person_id], function (err, result) {
            if (err) {
                res.status(401).json({
                    status: 400,
                    message: err
                })
            }
            else {
                res.json({
                    status: 200,
                    message: result
                })
            }
        })
})

///////////delete person/////////////


app.delete('/api/deletePerson/:id', [authJwt.verifyToken], function (req, res) {
    var id = req.params.id;
    const query = "delete from person_master where person_id=" + req.params.id;
    connection.query(query, function (error, rows) {
        if (error) {
            ////console.log('Error in query');
            res.status(401).send({
                error:true,
                message:"Person Not Found"
            });
            return;
        }
        else {
            res.send({message:'Record has been deleted'});
        }
    })
})


////////////////////////  get advt details  ///////////////////////////////

app.get('/api/getAdvts', [authJwt.verifyToken], (req, res) => {


    if (req.type_of_user == 'CLIENT') {
        connection.query('select * from advt_master inner join client_master on  client_master.client_id = advt_master.client_id', (err, result) => {
            if (err) throw err;
            else {
                ////console.log(result);
                if (result) {
                    result = result.filter(item => {
                        return item.email_address == req.username
                    }
                    ).map( item => {
                        console.log("item",item);
                        let publish_dates = fetchPublishDates(item);
                        console.log("publish_dates", publish_dates);

                        return (
                            {
                                ...item,
                                publish_dates,
                                client_name: encryption.decrypt(item.client_name),
                                gst_number: encryption.decrypt(item.gst_number),
                                phone_number: encryption.decrypt(item.phone_number),
                                advt_subject: encryption.decrypt(item.advt_subject),
                                advt_details: encryption.decrypt(item.advt_details),
                                registration_details: encryption.decrypt(item.registration_details),
                                representative_name: encryption.decrypt(item.representative_name),
                                type: item.type.split(","),
                                location_ids: item.location_ids.split(",").map(n=>+n),
                                block_ids: item.block_ids.split(",").map(n=>+n)
                            }
                        );
                    })
                }
                res.send(result)
            }
        })
    }
    else {

        var queryData = 'select client_id from client_master where admin_user_name = ?';
        connection.query(queryData, [req.username], function (err, result) {
            if (err) {
                console.log(err);
            }
            else {
                if(!result || !result[0]){
                    res.send([])
                    return;
                }
                let validClientIds = result.map((item) => {
                    console.log(item.client_id);
                    return item.client_id;
                });

                connection.query('select * from advt_master inner join client_master on  client_master.client_id = advt_master.client_id where client_master.client_id in (?)', [validClientIds], (err, result) => {
                    if (err) {
                        res.status(401).send({
                            error:true,
                            err,
                            message:'Error'
                        });
                        return;
                    }
                    else {
                        ////console.log(result);
                        if (result) {
                            result = result.map(  item => {
                                let publish_dates = fetchPublishDates(item);
                                return (
                                    {
                                        ...item,
                                        client_name: encryption.decrypt(item.client_name),
                                        gst_number: encryption.decrypt(item.gst_number),
                                        phone_number: encryption.decrypt(item.phone_number),
                                        advt_subject: encryption.decrypt(item.advt_subject),
                                        advt_details: encryption.decrypt(item.advt_details),
                                        registration_details: encryption.decrypt(item.registration_details),
                                        representative_name: encryption.decrypt(item.representative_name),
                                        type: item.type.split(","),
                                        location_ids: item.location_ids.split(",").map(n=>+n),
                                        block_ids: item.block_ids.split(",").map(n=>+n),
                                        publish_dates
                                    }
                                );
                            })
                        }
                        res.send(result)
                    }
                })
            }
        });
    }

});

async function  fetchPublishDates(item){
    console.log("11111111111");
    let results = await new Promise((resolve, reject) => {
        const query = 'select *, CONVERT_TZ(from_publish_date,\'+00:00\',\'+05:30\') as from_publish_date,  CONVERT_TZ(to_publish_date,\'+00:00\',\'+05:30\') as to_publish_date from PUBLISH_DATE where advt_id = ?';
        connection.query(query, [item.advt_id], function (err, rows) {
            if (err || !rows || !rows.length) {
                reject([]);

                return;
            }
            let publish_dates = [];
          
            rows.forEach(row => {
                // let offset = '+5.5'
                // let d = new Date(row.from_publish_date);
                // let utc = d.getTime() + (d.getTimezoneOffset() * 60000);
                // let nd = new Date(utc + (3600000 * offset));
                // let from_publish_date = nd;
                // d = new Date(row.to_publish_date);
                // utc = d.getTime() + (d.getTimezoneOffset() * 60000);
                // nd = new Date(utc + (3600000 * offset));
                // let to_publish_date = nd;
                console.log("row",row);
                let from_publish_date = row.from_publish_date;
                let to_publish_date = row.to_publish_date;
                publish_dates.push({
                    from_publish_date,
                    to_publish_date
                });
            });
            resolve(publish_dates);
        });
    });
    console.log("results",results);
    console.log("2222222222222");
    return results;
}

app.get('/api/getAdvt/:id', [authJwt.verifyToken],  (req, res) => {

    connection.query('select * from client_master inner join advt_master on client_master.client_id= advt_master.client_id where advt_master.advt_id = ?', [req.params.id],async (err, result) => {
        if (err) throw err;
        else {
            if (!result[0] ||
                (req.type_of_user == 'CLIENT' ? result[0].email_address != req.username : result[0].admin_user_name != req.username)

            ) {
                console.log(result, req.username);
                res.status(401).send({
                    message: "Invalid Request",
                    data: result,
                    query: result[0]
                })
                return;
            }
            ////console.log(result);
            let data = result[0];
            if (data) {
                data.client_name = encryption.decrypt(data.client_name),
                    data.gst_number = encryption.decrypt(data.gst_number),
                    data.phone_number = encryption.decrypt(data.phone_number),
                    data.advt_subject = encryption.decrypt(data.advt_subject);
                data.advt_details = encryption.decrypt(data.advt_details);
                data.registration_details = encryption.decrypt(data.registration_details);
                data.representative_name = encryption.decrypt(data.representative_name);
                data.type = data.type.split(",");
                data.block_ids = data.block_ids.split(",").map(n=>+n);
                data.location_ids = data.location_ids.split(",").map(n=>+n);
                console.log("IN");
                data.publish_dates = await fetchPublishDates(data);
                console.log("OUT",data.publish_dates);
            }

            // const query = 'select * from PUBLISH_DATE where advt_id = ?';
            // connection.query(query, [req.params.id], function (err, rows) {
            //     console.log("rows",rows);
            //     if (err || !rows || !rows.length) {
            //         res.send({
            //             error: true,
            //             message: 'Publish Dates not found'
            //         });
            //         return;
            //     }
            //     let publish_dates = [];
            //     rows.forEach(row => {
            //         publish_dates.push({
            //             from_publish_date: row.from_publish_date,
            //             to_publish_date: row.to_publish_date
            //         });
            //     });
            //     console.log("publish_dates",publish_dates);
               
            // });

            res.send(
                { data: result[0] })
           
        }
    })
});

/////////////post advt //////////////////////

app.post('/api/addAdvt', [authJwt.verifyToken], urlencodedParser, function (req, res) {
    let msgs = [];
    if (!req.body.location_ids || !req.body.location_ids.length) {
        msgs.push('Please Send Location Ids');
    }
    if (!req.body.block_ids || !req.body.block_ids.length) {
        msgs.push('Please  Send Block Ids');
    }
    if (!req.body.publish_dates || !req.body.publish_dates.length) {
        msgs.push("Please Select Atlease One publish Date");
    }

    if (msgs.length) {
        res.status(401).send({
            error: true,
            message: msgs
        });
        return;
    }

    var advtDetails = {
        client_id: req.body.client_id,
        advt_subject: encryption.encrypt(req.body.advt_subject),
        advt_details: encryption.encrypt(req.body.advt_details),
        country_id: req.body.country_id,
        state_id: req.body.state_id,
        district_id:req.body.district_id,
        city_id: req.body.city_id,
        location_ids: req.body.location_ids.join(","),
        block_ids: req.body.block_ids.join(","),
        age_from: req.body.age_from,
        age_to: req.body.age_to,
        username: req.username,
        status: "unapproved",
        type: req.body.type.join(",")
    }

    const client_query = `select * from client_master where client_id = ?`;
    connection.query(client_query, [req.body.client_id], function (err, rows) {
        if (err || !rows[0]) {
            res.send({
                err: true,
                message: 'Client Not Found'
            });
            return;
        }
        let client_record = rows[0];

        if (req.body.type.includes("voice")) {
            if (!req.body.voiceData) {
                res.status(401).send({
                    error: true,
                    message: 'Please Send Voice Message or Select another type'
                });
                return;
            }

            saveToDisc(req.body.voiceFileName, req.body.voiceFileExt, req.body.voiceData, function (err, filePath) {
                advtDetails.voiceFile = filePath;
                connection.query('INSERT INTO advt_master SET ?', advtDetails, function (err, rows) {
                    console.log("rows", rows);
                    if (err) {
                        res.status(401).send({ error: true, message: 'Error inserting records' });
                        return;
                    }

                    let advt_id = rows.insertId;
                    let publish_date_query = 'insert into PUBLISH_DATE(advt_id,from_publish_date,to_publish_date) values ?';
                    let publish_date_record = [];
                    req.body.publish_dates.forEach(date => {
                        publish_date_record.push([
                            advt_id,
                             date.from_publish_date,
                             date.to_publish_date
                        ]);
                    });
                    connection.query(publish_date_query, [publish_date_record], function (err, rows) {
                        console.log("erR",err);
                        if (err) {
                            connection.query('delete from advt_master where advt_id = ?', [advt_id], function (err, rows) {
                                res.status(401).send({
                                    error: true,
                                    message: 'Server Error',
                                    err
                                });
                            });
                            return;
                        }
                        res.send({ message: 'successfully added record.' });
                        sendMessage((client_record.email_address), 'New Advertisement Created',
                            'Please review Advertisement Created for you by ' + req.username, function (err) {
                                console.log(err);
                                console.log(client_record.email_address);
                            });

                    });

                });
                return;
            });
            return;
        }


        connection.query('INSERT INTO advt_master SET ?', advtDetails, function (err, rows) {
            console.log("rows", rows);
            if (err) {
                res.status(401).send({ error: true, message: 'Error inserting records' });
                return;
            }
            let advt_id = rows.insertId;
            let publish_date_query = 'insert into PUBLISH_DATE(advt_id,from_publish_date,to_publish_date) values ?';
            let publish_date_record = [];
            req.body.publish_dates.forEach(date => {
                publish_date_record.push([
                    advt_id,
                     date.from_publish_date,
                     date.to_publish_date
                ]);
            });
            connection.query(publish_date_query, [publish_date_record], function (err, rows) {
                console.log(err);
                if (err) {
                    connection.query('delete from advt_master where advt_id = ?', [advt_id], function (err, rows) {
                        res.status(401).send({
                            error: true,
                            message: 'Server Error',
                            err
                        });
                    });
                    return;
                }
                res.send({ message: 'successfully added record.' });
                sendMessage((client_record.email_address), 'New Advertisement Created',
                    'Please review Advertisement Created for you by ' + req.username, function (err) {
                        console.log(err);
                        console.log(client_record.email_address);
                    });

            });
        });
    })

});



////////////////////////////////////////////////UPDATE ADVT/////////////////////////////////////////////////////////
app.put('/api/updateStatuAdvt/:id', [authJwt.verifyToken], urlencodedParser, function (req, res) {
    var sql = "update advt_master set ? where advt_id=" + req.params.id;
    connection.query(sql,{status:req.body.status},function(err,roes){
        if(err){
            res.status(401).send({
                message:"Error updating",
                err,
                error:true
            });
            return;
        }
        
        res.send({
            message:"Updated records",
            error:false
        });
    })

});

app.put('/api/updateadvt/:id', [authJwt.verifyToken], urlencodedParser, function (req, res) {
    let msgs = [];
    if (!req.body.location_ids || !req.body.location_ids.length) {
        msgs.push('Please Send Location Ids');
    }
    if (!req.body.block_ids || !req.body.block_ids.length) {
        msgs.push('Please  Send Block Ids');
    }
    if (!req.body.publish_dates || !req.body.publish_dates.length) {
        msgs.push("Please Select Atlease One publish Date");
    }

    if (msgs.length) {
        res.status(401).send({
            error: true,
            message: msgs
        });
        return;
    }

   

    var fetchSql = "select * from advt_master where advt_id=?";
    connection.query(fetchSql, [req.params.id], function (err, rcds) {
        if (err || !rcds[0] || rcds[0].status == 'published') {
            res.status(401).send({ error: true, message: 'UnAuthorized' });
            return;
        }

        var advtDetails = {
            client_id: req.body.client_id,
            advt_subject: encryption.encrypt(req.body.advt_subject),
            advt_details: encryption.encrypt(req.body.advt_details),
            age_from: req.body.age_from,
            age_to: req.body.age_to,
            username: req.body.username,
            status: req.body.status,
            type: req.body.type.join(","),
            country_id:req.body.country_id,
            state_id:req.body.state_id,
            district_id:req.body.district_id,
            city_id:req.body.city_id,
            location_ids: req.body.location_ids.join(","),
            block_ids: req.body.block_ids.join(",")
        }

        var sql = "update advt_master set ? where advt_id=" + req.params.id;

        if (req.body.type.includes("voice") && req.body.voiceData) {

            saveToDisc(req.body.voiceFileName, req.body.voiceFileExt, req.body.voiceData, function (err, filePath) {
                advtDetails.voiceFile = filePath;
                if (err) {
                    res.status(401).send({
                        error: true,
                        e: err,
                        message: 'error updating record'
                    });
                    return;
                }
                connection.query(sql, advtDetails, function (err, result) {
                    if (err) {
                        ////console.log(err);
                        console.log(err);
                        res.status(401).send({
                            error: true,
                            message: 'error updating record'
                        })
                    }
                    else {                        
                        let advt_id = req.params.id;
                        let publish_date_query = 'insert into PUBLISH_DATE(advt_id,from_publish_date,to_publish_date) values ?';
                        let publish_date_record = [];
                        if(req.type_of_user == 'CLIENT' && advtDetails.status == 'approved'){
                            
                            // publish(advtDetails);
                        }
                        req.body.publish_dates.forEach(date => {
                            publish_date_record.push([
                                advt_id,
                                 date.from_publish_date,
                                 date.to_publish_date
                            ]);
                        });

                        console.log("publish_date_record",publish_date_record);
                        connection.query('delete from PUBLISH_DATE where advt_id = ?', [req.params.id],
                            function (err, rows) {
                                if (err) {
                                    res.send({ message: 'Record has been updated' });
                                    return;
                                }
                                connection.query(publish_date_query, [publish_date_record], function (err, rows) {

                                    res.send({ message: 'Record has been updated' });
                                });
                            });
                    }
                });
            });
            return;
        }
        if (req.body.type.includes("voice") && (!req.body.voiceData && !req.body.voiceFile)) {
            res.status(401).send({
                error: true,
                message: 'Please Send Voice Message or Select another type'
            });
            return;
        }

        connection.query(sql, advtDetails, function (err, result) {
            if (err) {
                ////console.log(err);
                console.log(err);
                res.status(401).send({
                    error: true,
                    message: 'error updating record'
                })
            }
            else {
                if(req.type_of_user == 'CLIENT' && advtDetails.status == 'approved'){
                            
                    publish(advtDetails);
                }
                let advt_id = req.params.id;
                let publish_date_query = 'insert into PUBLISH_DATE(advt_id,from_publish_date,to_publish_date) values ?';
                let publish_date_record = [];
                req.body.publish_dates.forEach(date => {
                    publish_date_record.push([
                        advt_id,
                         date.from_publish_date,
                         date.to_publish_date
                    ]);
                });
                console.log("publish_date_record",publish_date_record);
                connection.query('delete from PUBLISH_DATE where advt_id = ?', [req.params.id],
                    function (err, rows) {
                        if (err) {
                            res.send({ message: 'Record has been updated' });
                            return;
                        }
                        connection.query(publish_date_query, [publish_date_record], function (err, rows) {

                            res.send({ message: 'Record has been updated' });
                        });
                    });
            }
        });
    });

})


app.delete('/api/deleteAdvt/:id', [authJwt.verifyToken], function (req, res) {
    var id = req.params.id;
    ////console.log(req.body);
    const query = "delete from `advt_master` where advt_id=" + id;
    ////console.log(query);
    connection.query(query, function (error, rows) {
        if (error) {
            ////console.log('Error in query');
            ////console.log(query)
            res.status(401).send({
                error: true,
                message: 'Record not deleted',
                err: error
            });
            return;
        }
        else {
            connection.query('delete from PUBLISH_DATE where advt_id = ?', [id], function (error, rows) {
                if (error) {
                    res.status(401).send({
                        error: true,
                        message: 'Record not deleted',
                        err: error
                    });
                    return;
                }

                res.send({message:'Record has been deleted'});
            })
        }
    })
})

/////////////////////////////////login//////////////////////
app.post('/api/login', urlencodedParser, function (req, res) {

    var username = req.body.username;
    var password = req.body.password;
    ////console.log('---------------- username', username);
    ////console.log('------------------ password', password);

    resultsObj = {};
    if (username != null || username != "" || username != "undefined" &&
        password != null || password != "" || password != "undefined") {
        var queryLogin = 'SELECT * FROM login WHERE username = ? and password = ? and isActive = "Y"';
        ////console.log(queryLogin);
        connection.query(queryLogin, [username, password], function (error, results, fields) {
            if (results.length > 0) {
                ////console.log("----- if (results.length > 0)");

                // ////console.log("===============",results.length)
                var string = JSON.stringify(results);
                var json = JSON.parse(string);
                // if (json[0].isActive == 'N') {
                //     res.json({
                //         status: 401,
                //         message: "User is inactive. Kindly contact administrator"
                //     });
                //     return;
                // }

                var token = jwt.sign({
                    username: json[0].username
                }, config.secret, {
                        expiresIn: 86400 // expires in 24 hours
                    });
                res.json({
                    status: 200,
                    message: 'successfully authenticated',
                    accessToken: token,
                    typeOfUser: json[0].type_of_user,
                    firstname: json[0].firstname,
                    lastname: json[0].lastname
                })
            }// if closed
            else if (results.length == 0 || results.length < 0) {
                ////console.log("================", results.length);   
                ////console.log(" Username or password does not match");
                res.json({
                    status: 401,
                    message: "Username or Password does not match"
                });
            }
        });
    } else {
        ////console.log(" --------  Invalid User")

        res.json({
            status: 401,
            message: 'Invalid data format '
        })
    }

})



app.get('/api/getPublish', [authJwt.verifyToken], (req, res) => {
    connection.query('select messages_to_all, age_group from advt_publish', (err, rows) => {
        if (err) throw err;
        else {
            if (rows) {
                rows = rows.map(row => {
                    return {
                        ...row,
                        gender: encryption.encrypt(row.gender),
                        text_message: encryption.encrypt(row.text_message)
                    }
                })
            }
            res.json(rows);
        }
    })
})



app.use('/api/client', clientRouter);
// app.use('/api/log', logger);


function saveToDisc(name, fileExt, base64String, callback) {
    console.log("HERE ", name, fileExt);
    let d = new Date();
    let pathFile = "/public/audio/" + name + d.getTime() + Math.floor(Math.random() * 1000) + "." + fileExt;
    let fileName = path.join(__dirname, pathFile);
    let dataBytes = Buffer.from(base64String, 'base64');
    // console.log(base64String);
    fs.writeFile(fileName, dataBytes, function (err) {
        if (err) {
            callback(err);
        } else {
            callback(null, pathFile);
        }
    });
}


function getIndianTime(offset = '+5.5') {
    // create Date object for current location
    var d = new Date();

    // convert to msec
    // subtract local time zone offset
    // get UTC time in msec
    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);

    // create new Date object for different city
    // using supplied offset
    var nd = new Date(utc + (3600000 * offset));

    // return time as a string
    return nd;
}
