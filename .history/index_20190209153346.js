var connection = require('./db.connection');
const express = require('express');

var app = express();
var cors = require('cors');
app.use(cors());
const route = express.Router;
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
app.use(bodyParser.json());
var jwt = require('jsonwebtoken');
const config = require('./config');
const authJwt = require('./auth/verifyToken');


connection.connect((err) => {
    if (err) {
        throw err;
    }
    console.log("connected");
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
    console.log('Server is running on ',PORT);
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
        console.log(res);
        res.send('database created');
    })
});


//////////////////get block ///////////////////////////
app.get('/api/getBlock', [authJwt.verifyToken],(req, res) => {
    connection.query('select * from block_master', (err, rows) => {
        if (err) throw err;
        else {

            res.json(rows);
        }
    })
});

////////////////// get location ///////////////////////

app.post('/api/getLocation', [authJwt.verifyToken],(req, res) => {
    // var locationData = {
    //     country_id : req.selectedCountry,
    //     state_id : req.selectedState,
    //     city_id : req.selectedCity
    //   } 
    var location = req.get("locationData");


    console.log("--------req.body.country_id---------- ", req.body.country_id);
    console.log("---------req.body.city_id---------- ", req.body.city_id);
    console.log("-----------req.body.state_id-------- ", req.body.state_id);
    //console.log("-----------req.body.country_id", country_id);

    var query = "";
    if (req.body.country_id != null && req.body.country_id != ""
        && req.body.country_id != "undefined" && req.body.city_id != null && req.body.city_id != ""
        && req.body.city_id != "undefined" && req.body.state_id != null &&
        req.body.state_id != "" && req.body.state_id != "undefined") {
        console.log("----------- ifffffffffffffffffffffff");
        query = " select * from greattug_advt_publish.location_master where country_id =" + req.body.country_id + " and state_id=" + req.body.state_id + " and city_id=" + req.body.city_id;

        console.log("query-------------", query);
    }
    if (query != "") {
        connection.query(query, (err, result) => {
            if (err) throw err;
            else {
                res.json(result);
                console.log(result)
            }
        })

    } else {
        console.log("error===>",err)
        res.json({
            status: 400,
            message: "There is no location specified for specified/selected country, state and city"
        })

    }
    // console.log("location ====================",result);
    // connection.query('select * from location_master where country_id=? && state_id= ? && city_id= ?'
});

// get Country Details
app.get('/api/getCountryDetails', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from country_master', (err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // console.log(result)
    })
});

// get State
app.get('/api/getState', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from state_master', (err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // console.log(result)
    })
});


// get city
app.get('/api/getCities', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from city_master', (err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // console.log(result)
    })
})


////////////////////get floor ////////////////////////

app.get('/api/getFloor', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from floor_master', (err, result) => {
        if (err) throw err;
        else {
            res.json(result)
        }
        // console.log(result)
    })
});

// Get all person 
app.get('/api/getPerson', [authJwt.verifyToken], (req, res) => {
connection.query('SELECT *, DATE_FORMAT(date_of_birth, "%d %m %Y") as date_of_birth FROM publish_advertisement.person_master', (err, result) => {
        // console.log(pid)
        if (err) throw err;
        else {
            console.log(result);
            res.json(result)
        }
    });
});

//////////////////////// get person ///////////////////////////////////////

// app.get('/api/getPerson', (req, res) => {
//     var person_id = req.body.person_id; 
//     connection.query(`SELECT country_master.country_name, country_master.country_id,person_master.firstname, 
//         person_master.lastname, person_master.middlename, person_master.date_of_birth, person_master.mobile_number1,
//         person_master.gender, person_master.address, person_master.pincode,
//         state_master.state_id, state_master.statename, city_master.city_id, city_master.cityname
//         FROM  country_master
//         LEFT JOIN person_master ON country_master.country_id = person_master.country_id
//         left join state_master ON person_master.state_id = state_master.state_id
//         left join city_master ON person_master.city_id = city_master.city_id
//         where person_master.person_id = ?`,[person_id], (err, result) => {
//             // console.log(result);
//         if (err) throw err;
//         else {
//             console.log("Result is here: ",result);
//             res.json(result)
//         }
//     })
// });

///////////////// post person ///////////////////

app.post('/api/advtPerson', [authJwt.verifyToken], urlencodedParser, function (req, res) {
    var personDetails = {
        firstname: req.body.firstname,
        middlename: req.body.middlename,
        lastname: req.body.lastname,
        country_id:req.body.country_id, 
        state_id: req.body.state_id,
        city_id: req.body.city_id,
        block_id: req.body.block_id,
        address: req.body.address,
        floor_id: req.body.floor_id,
        location_id: req.body.location_id,
        date_of_birth: req.body.date_of_birth,
        pincode: req.body.pincode,
        gender: req.body.gender,
        mobile_number1: req.body.mobile_number1,
        mobile_number2: req.body.mobile_number2,
        username: 'akash',
        creation_date: req.body.creation_date
    }
    // console.log(req.body);
    var mobileNumberValidation = 'select COUNT(*) AS count from person_master WHERE mobile_number1 = ?'
    connection.query(mobileNumberValidation, [personDetails.mobile_number1], function (err, rows) {
        console.log(rows);
        const count = rows[0].count;
        console.log(count);        
        if(count > 0) {
            res.json({
                status: 401,
                message: "Given Mobile Number is Registered. Please provide another number."
            });
            console.log("Please Provide another number");
        }
        else {
            res.json({
                status: 200,
                message: "User is inactive. Kindly contact administrator"
            });
            connection.query("INSERT INTO person_master SET ?", personDetails, function(err, result) {
                console.log("result : ", result);
            });
        }
        res.send(this.firstname);
    });
});

///////update person//////////////

app.put('/api/updatePerson/:person_id', [authJwt.verifyToken], urlencodedParser, function (req, res) {
    var query = "update person_master SET firstname=?,middlename=?,lastname=?, block_id=?, address=?, floor_id=?, location_id=?, date_of_birth=?, pincode=?, mobile_number1=?, mobile_number2=?, gender=? WHERE person_id=?";
    console.log('query --- ', query);
    connection.query(query, [req.body.firstname, req.body.middlename, req.body.lastname, req.block_id, req.address, req.floor_id, req.location_id, req.date_of_birth, req.pincode, req.mobile_number1, req.mobile_number2, req.gende, req.body.person_id], function (err, result) {
        if (err) {
            res.json({
                status: 400,
                message: err
            })
        }
        else {
            console.log(query);
            console.log("firstName--------", req.body.firstname);
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
    console.log(req.body);
    const query = "delete from `personform` where id=" + id;
    console.log(query);
    connection.query(query, function (error, rows) {
        if (error) {
            console.log('Error in query');
        }
        else {
            res.send('Record has been deleted');
        }
    })
})




///////////////// get client ///////////////////

app.get('/api/getClient', [authJwt.verifyToken], (req, res) => {
    connection.query('select * from client_master', (err, result) => {
        if (err) throw err;
        else {
            // console.log(result);
            res.json(result)
        }
    })
});


////////////////////////  get advt details  ///////////////////////////////

app.get('/api/getAdvt', [authJwt.verifyToken], (req, res) => {
    connection.query('select clientName, advt_details from client_master inner join advt_master on client_master.client_id= advt_master.client_id', (err, result) => {
        if (err) throw err;
        else {
            console.log(result);
            res.json(result)
        }
    })
});

/////////////post advt //////////////////////

app.post('/api/addAdvt', [authJwt.verifyToken], urlencodedParser, function (req, res) {
    var advtDetails = {
        client_id: req.body.client_id,
        advt_subject: req.body.advt_subject,
        advt_details: req.body.advt_details,
        publish_date: req.body.publish_date,
        age_from: req.body.age_from,
        age_to: req.body.age_to,
        username: req.body.username,
    }
    console.log(req.body);
    connection.query('INSERT INTO advt_master SET ?', advtDetails, function (err, res) {
        if (err) throw err;
        console.log("1 record added");
    })
    res.send(this.advt_details);
})


////////////////////////////////////////////////UPDATE ADVT/////////////////////////////////////////////////////////



app.put('/api/updateadvt/:id', [authJwt.verifyToken], urlencodedParser, function (req, res) {
    var advtDetails = {
        client_id: req.body.client_id,
        advt_subject: req.body.advt_subject,
        advt_details: req.body.advt_details,
        publish_date: req.body.publish_date,
        age_from: req.body.age_from,
        age_to: req.body.age_to,
        username: req.body.username,
    }

    var sql = "update advt_master set ? where id=" + req.params.id;
    connection.query(sql, function (err, result) {
        if (err) {
            console.log(err);

        }
        else {
            res.send('Record has been updated');
        }
    });
})


app.delete('/api/deleteAdvt/:id', [authJwt.verifyToken], function (req, res) {
    var id = req.params.id;
    console.log(req.body);
    const query = "delete from `advt_master` where id=" + id;
    console.log(query);
    connection.query(query, function (error, rows) {
        if (error) {
            console.log('Error in query');
            console.log(query)
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
    resultsObj = {};
    if (username != null || username != "" || username != "undefined" &&
        password != null || password != "" || password != "undefined") {
        var queryLogin = 'SELECT * FROM login WHERE username = ? and password = ? and isActive = "Y"';
        console.log(queryLogin);
        connection.query(queryLogin, [username, password], function (error, results, fields) {
            if (results.length > 0) {
            console.log("----- if (results.length > 0)");

                // console.log("===============",results.length)
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
                    username:json[0].username
                }, config.secret, {
                    expiresIn: 86400 // expires in 24 hours
                });
                res.json({
                    status: 200,
                    message: 'successfully authenticated',
                    accessToken:token,
                    typeOfUser: json[0].type_of_user,
                    firstname: json[0].firstname,
                    lastname: json[0].lastname
                })
            }// if closed
            else if (results.length == 0 || results.length < 0) {
                console.log("================", results.length);
                
                console.log(" Username or password does not match");
                res.json({
                    status: 401,
                    message: "Username or Password does not match"
                });
            }
        });
    } else {
        console.log(" --------  Invalid User")
       
        res.json({
                 status: 401,
            message: 'Invalid data format '
        })
    }

})

///////////////////////client////////////////////////////

app.get('/api/getClient', [authJwt.verifyToken], function (req, res) {
    connection.query('SELECT * FROM client_master', function (error, rows) {
        if (error) {
            console.log('Error  y')
        }
        else {
            console.log('Successful query')
            console.log(rows);
            // res.send('Hello ' +rows[1].firstname);
            res.json(rows);
        }
    })
});

///////////////////advt-publish/////////////
////////////get//////////////////////

app.get('/api/getPublish', [authJwt.verifyToken], (req, res) => {
    connection.query('select messages_to_all, age_group from advt_publish', (err, rows) => {
        if (err) throw err;
        else {
            res.json(rows);
        }
    })
})

////////////////post//////////////

app.post('/api/advtPublish', [authJwt.verifyToken], urlencodedParser, function (req, res) {
    var query = 'SELECT advt_id FROM advt_master';
    console.log(query);
    connection.query(query, function (err, result) {
        if (err) throw err;
        console.log('added')
        var publishDetails = {
            gender_type: req.body.gender_type,
            location_id: req.body.location_id,
            block_id: req.body.block_id,
            username: req.body.username
        }
        var insertQuery = 'INSERT INTO advt_publish SET ?';
        console.log('---------------- insertQuery', insertQuery);
        connection.query(insertQuery, publishDetails, function (err, res) {
            if (err) throw err;
            console.log('1 row added');
        })
        // res.send('successful');
    });
})

// function setSqlQueryForPerson(publishDetails) {

//     var query = 'SELECT * FROM publish_advertisement.personform';

//     if(publishDetails.gender_type != null || publishDetails.gender_type != '' || 
//         publishDetails.location_id || publishDetails.location_id != null ) {
//             query = query + 'where';
//     }

//     // if gender is present
//     if(publishDetails.gender_type != null || publishDetails.gender_type != '') {
//         query = query + 'gender =' +publishDetails.gender_type;
//         // Check block id array length
//         if(publishDetails.block_id != null || publishDetails.block_id != '' ) {
//             // put a loop if multiple selection of block id there 
//             query = query + ' and block_id =' + publishDetails.block_id ;
//     }

//     if(publishDetails.location_id != null || publishDetails.location_id != '' ) {
//         // put a loop if multiple selection of location_idthere 
//         query = query + ' and location_id =' + publishDetails.location_id ;
// }

//     }elseif()
//     }





    // db.query('SELECT count(*) as Resultcount FROM tablename WHERE email = ? and password = ?', [post.email, post.password], function(error, result){
    //     if (result[0].Resultcount == 0){
    //         var query2 = db.query('INSERT INTO tablename SET ?', [post], function(err, result) {
    //             if(err){
    //               console.log(err);
    //            }
    //              console.log(result);
    //           });
    //     }
    //     else{
    //         console.log('have data already');
    //     }
    // });