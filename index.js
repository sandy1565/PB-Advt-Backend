var connection = require('./db.connection');
const express = require('express');
// const crypto = require('crypto');
var app = express();
var cors = require('cors');
var sendMessage = require('./email-sender');
app.use(cors());
const route = express.Router;
var bodyParser = require('body-parser');
const encryption = require('./encryption');
var urlencodedParser = bodyParser.urlencoded({ extended: false, parameterLimit: 100000, limit: '10mb' });
app.use(bodyParser.json({ limit: '10mb' }));
var jwt = require('jsonwebtoken');
const config = require('./config');
const authJwt = require('./auth/verifyToken');
var clientRouter = require('./client-route');
var cron = require('node-cron');
let d = 0;
cronJob('0 5 18 * * *');


function cronJob(timePattern) {
    cron.schedule(timePattern, () => {
        const allAdvrtQuery = `select * from advt_master`;
        let today = new Date();
        connection.query(allAdvrtQuery, function (err, results) {
            if (err || !results[0]) {
                console.log("1", err);
                return;
            }
            // console.log("results",results)
            let allAdverts = results;
            const personsQuery = `select * from person_master`;
            connection.query(personsQuery, function (err, results) {
                if (err || !results[0]) {
                    console.log("2", err);
                    return;
                }
                let allPersons = results;
                // console.log(allPersons);
                allAdverts.forEach(advert => {
                    let publishDate = new Date(advert.publish_date);
                    let allEmails = [];
                    if (publishDate.getDate() == today.getDate() &&
                        publishDate.getMonth() == today.getMonth() &&
                        publishDate.getFullYear() == today.getFullYear()) {
                        let selectedPersons = allPersons.filter(person => {

                            return (
                                advert.age_from <= person.age && person.age <= advert.age_to
                            );
                        });
                        selectedPersons.forEach(person => {
                            if (person.email_id) {
                                allEmails.push(person.email_id);
                            }
                        });
                        if (allEmails.length) {
                            sendMessage(allEmails.join(","), advert.advt_subject, advert.advt_details, function (err) {
                                if (err) {

                                    return;
                                }
                                console.log("SENT MESSAGES");
                            });
                        }

                    }
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
    // Website you wish to allow to connect
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

var PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
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

// Get all person 
app.get('/api/getPerson', [authJwt.verifyToken], (req, res) => {
    connection.query('SELECT *, DATE_FORMAT(date_of_birth, "%d %m %Y") as date_of_birth FROM greattug_advt_publish.person_master', (err, result) => {
        if (err) throw err;
        else {
            const resArr = [];
            result.map(item => {
                console.log(item.firstname);
                item.firstname = encryption.decrypt((item.firstname).toString());
                item.middlename = item.middlename ? encryption.decrypt(item.middlename): item.middlename,
                item.lastname = encryption.decrypt(item.lastname);
                item.address = encryption.decrypt(item.address);
                item.gender = encryption.decrypt(item.gender);
                item.mobile_number1 = encryption.decrypt(item.mobile_number1);
                item.mobile_number2 = encryption.decrypt(item.mobile_number2);
                resArr.push(item);
            });
            res.json(resArr);
        }
    });
});

/* get Person AS PER person_id*/
app.get('/api/getPersonData/:id', [authJwt.verifyToken], (req, res) => {
    connection.query('select *, DATE_FORMAT(date_of_birth, "%Y-%m-%d") as date_of_birth from person_master where person_master.person_id = ?', [req.params.id], (err, result) => {
        if (err) throw err;
        else {
            let data;
            if (result[0]) {
                data = result[0];
                data.firstname = encryption.decrypt(data.firstname);
                data.middlename =  data.middlename ? encryption.decrypt(data.middlename): data.middlename,

                data.lastname = encryption.decrypt(data.lastname);
                data.address = encryption.decrypt(data.address);
                data.gender = encryption.decrypt(data.gender);
                data.mobile_number1 = encryption.decrypt(data.mobile_number1);
                data.mobile_number2 = encryption.decrypt(data.mobile_number2);
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
        middlename: req.body.middlename ? encryption.encrypt(req.body.middlename): req.body.middlename,
        lastname: encryption.encrypt(req.body.lastname),
        country_id: req.body.country_id,
        state_id: req.body.state_id,
        city_id: req.body.city_id,
        block_id: req.body.block_id,
        address: encryption.encrypt(req.body.address),
        floor_id: req.body.floor_id,
        location_id: req.body.location_id,
        date_of_birth: req.body.date_of_birth,
        pincode: req.body.pincode,
        gender: encryption.encrypt(req.body.gender),
        mobile_number1: encryption.encrypt(req.body.mobile_number1),
        mobile_number2: encryption.encrypt(req.body.mobile_number2),
        username: req.username,
        creation_date: req.body.creation_date
    }
    // ////console.log(req.body);
    var mobileNumberValidation = 'select COUNT(*) AS count from person_master WHERE mobile_number1 = ?'
    connection.query(mobileNumberValidation, [personDetails.mobile_number1], function (err, rows) {
        ////console.log(rows);
        const count = rows[0].count;
        ////console.log(count);        
        if (count > 0) {
            res.json({
                status: 401,
                message: "Given Mobile Number is Registered. Please provide another number."
            });
            ////console.log("Please Provide another number");
        }
        else {
            connection.query("INSERT INTO person_master SET ?", personDetails, function (err, result) {
                if (err) {
                    res.json({
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
     req.body.middlename ? encryption.encrypt(req.body.middlename): req.body.middlename,
    encryption.encrypt(req.body.lastname),
    req.body.country_id,
    req.body.state_id,
    req.body.city_id,
    req.body.location_id,
    req.body.block_id,
    req.body.floor_id,
    encryption.encrypt(req.body.address),
    req.body.pincode,
    req.body.date_of_birth,
    encryption.encrypt(req.body.gender),
    encryption.encrypt(req.body.mobile_number1),
    encryption.encrypt(req.body.mobile_number2),
    req.params.person_id], function (err, result) {
        if (err) {
            res.json({
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
    const query = "delete from `personform` where id=" + id;
    connection.query(query, function (error, rows) {
        if (error) {
            ////console.log('Error in query');
        }
        else {
            res.send('Record has been deleted');
        }
    })
})


////////////////////////  get advt details  ///////////////////////////////

app.get('/api/getAdvts', [authJwt.verifyToken], (req, res) => {
    var queryData = 'select client_id from client_master where admin_user_name = ?';
    connection.query(queryData, [req.username], function (err, result) {
        if (err) {
            console.log(err);
        }
        else {
            let validClientIds = result.map((item) => {
                console.log(item.client_id);
                return item.client_id;
            });

            connection.query('select * from advt_master inner join client_master on  client_master.client_id = advt_master.client_id where client_master.client_id in (?)', [validClientIds], (err, result) => {
                if (err) throw err;
                else {
                    ////console.log(result);
                    if (result) {
                        result = result.map(item => {
                            return (
                                {
                                    ...item,
                                    advt_subject: encryption.decrypt(item.advt_subject),
                                    advt_details: encryption.decrypt(item.advt_details),
                                }
                            );
                        })
                    }
                    res.send(result)
                }
            })
        }
    });

});

app.get('/api/getAdvt/:id', [authJwt.verifyToken], (req, res) => {
    connection.query('select *, DATE_FORMAT(publish_date, "%Y-%m-%d") as publish_date from client_master inner join advt_master on client_master.client_id= advt_master.client_id where advt_master.advt_id = ?', [req.params.id], (err, result) => {
        if (err) throw err;
        else {
            if (!result[0] || result[0].admin_user_name != req.username) {
                console.log(result, req.username);
                res.status(401).send({
                    message: "Invalid Request",
                    data: result
                })
                return;
            }
            ////console.log(result);
            let data = result[0];
            if (data) {
                data.advt_subject = encryption.decrypt(data.advt_subject);
                data.advt_details = encryption.decrypt(data.advt_details);
            }
            res.json(
                { data: result[0] })
        }
    })
});

/////////////post advt //////////////////////

app.post('/api/addAdvt', [authJwt.verifyToken], urlencodedParser, function (req, res) {
    var advtDetails = {
        client_id: req.body.client_id,
        advt_subject: encryption.encrypt(req.body.advt_subject),
        advt_details: encryption.encrypt(req.body.advt_details),
        publish_date: req.body.publish_date,
        country_id: req.body.country_id,
        state_id: req.body.state_id,
        city_id: req.body.city_id,
        location_id: req.body.location_id,
        block_id: req.body.block_id,
        age_from: req.body.age_from,
        age_to: req.body.age_to,
        username: req.body.username,
    }
    ////console.log(req.body);
    connection.query('INSERT INTO advt_master SET ?', advtDetails, function (err, res) {
        if (err) throw err;
        ////console.log("1 record added");
    })
    res.send(this.advt_details);
})



////////////////////////////////////////////////UPDATE ADVT/////////////////////////////////////////////////////////


app.put('/api/updateadvt/:id', [authJwt.verifyToken], urlencodedParser, function (req, res) {
    var advtDetails = {
        client_id: req.body.client_id,
        advt_subject: encryption.encrypt(req.body.advt_subject),
        advt_details: encryption.encrypt(req.body.advt_details),
        publish_date: req.body.publish_date,
        age_from: req.body.age_from,
        age_to: req.body.age_to,
        username: req.body.username,
    }

    var sql = "update advt_master set ? where advt_id=" + req.params.id;
    connection.query(sql, advtDetails, function (err, result) {
        if (err) {
            ////console.log(err);
            console.log(err);
            res.staus(401).send({
                error: true,
                message: 'error updating record'
            })
        }
        else {
            res.send({ message: 'Record has been updated' });
        }
    });
})


app.delete('/api/deleteAdvt/:id', [authJwt.verifyToken], function (req, res) {
    var id = req.params.id;
    ////console.log(req.body);
    const query = "delete from `advt_master` where id=" + id;
    ////console.log(query);
    connection.query(query, function (error, rows) {
        if (error) {
            ////console.log('Error in query');
            ////console.log(query)
        }
        else {
            res.send('Record has been deleted');
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


///////////////////advt-publish/////////////
////////////get//////////////////////

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

////////////////post//////////////

app.post('/api/advtPublish', [authJwt.verifyToken], urlencodedParser, function (req, res) {
    var query = 'SELECT advt_id FROM advt_master';
    ////console.log(query);
    connection.query(query, function (err, result) {
        if (err) throw err;
        ////console.log('added')
        // ////console.log('----------------', req.body.fromAge);
        ////console.log('==================', req.body.text_message);

        var publishDetails = {
            gender: encryption.encrypt(req.body.gender),
            country_id: req.body.country_id,
            state_id: req.body.state_id,
            city_id: req.body.city_id,
            location_id: req.body.location_id,
            block_id: req.body.block_id,
            from_age: req.body.fromAge,
            to_age: req.body.toAge,
            text_message: encryption.encrypt(req.body.text_message)
            // username: 'sandeep'
        }
        var insertQuery = 'INSERT INTO greattug_advt_publish.advt_details SET ?';
        ////console.log('---------------- insertQuery', insertQuery);
        ////console.log('-----------------------------------', publishDetails);

        connection.query(insertQuery, publishDetails, function (err, res) {
            if (err) throw err;
            ////console.log('1 row added');
        })
        // res.send('successful');
    });
});



app.use('/api/client', clientRouter);
