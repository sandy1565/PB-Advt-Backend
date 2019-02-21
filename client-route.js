var express = require('express');
var router = express.Router();
var connection = require('./db.connection');
const authJwt = require('./auth/verifyToken');



router.get("/", [authJwt.verifyToken], function (req, res) {
    const queryStr = 'select * from client_master where admin_user_name=?';
    connection.query(queryStr, [req.username], async function (err, rows) {
        if (err) {
            res.status(401).send({
                error: true,
                data: [],
                message: "No Client records Found"
            });
            return;
        }
        res.send({
            data: rows,
            message: 'successfully fetched client records'
        });
    });
});

router.delete("/:client_id", [authJwt.verifyToken], function (req, res) {
    const queryStr = 'select * from client_master where client_id=? and admin_user_name=?';
    connection.query(queryStr, [req.params.client_id, req.username], async function (err, rows) {
        let record = rows[0];
        if (err || !record) {
            res.status(401).send({
                error: true,
                message: "No Client Found To Delete"
            });
            return;
        }
        const deleteLoginQuery = `delete from login where username=?`;
        const clientUserName = record.email_address;
        connection.query(deleteLoginQuery, [clientUserName], function (err, rows) {
            if (err) {
                res.status(401).send({
                    error: true,
                    message: "No Client Found To Delete"
                });
                return;
            }
            const deleteQuery = `delete from client_master where client_id=?`;
            connection.query(deleteQuery, [req.params.client_id], function (err, rows) {
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
    const queryStr = 'select * from client_master where client_id=? and admin_user_name=?';
    connection.query(queryStr, [req.params.client_id, req.username], async function (err, rows) {
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
        res.send({
            data: record,
            message: 'successfully fetched records'
        });

    });
});

router.put("/:client_id", [authJwt.verifyToken], function (req, res) {
    const queryStr = 'select * from client_master where client_id=? and admin_user_name=?';
    connection.query(queryStr, [req.params.client_id, req.username], async function (err, rows) {
        let record = rows[0];
        if (err || !record) {
            res.status(401).send({
                error: true,
                message: "Can't update client not found"
            });
            return;
        }

        ({ profile_pic, client_name, country_id, state_id, city_id, location_id, block_id, firm_type, gst_number, representative_name, representative_id, phone_number, email_address, registration_details } = req.body);
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


        const insertRecordToClientMaster = "update client_master set ? where client_id=" + "'" + req.params.client_id + "'";
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
                client_name, country_id, state_id,
                city_id, location_id, block_id,
                gst_number, representative_name,
                representative_id, phone_number,
                registration_details,
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
    ({ profile_pic, client_name, country_id, state_id, city_id, location_id, block_id, firm_type, gst_number, representative_name, representative_id, phone_number, email_address, registration_details } = req.body);
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
                    message: "Error inserting records."
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
                    client_name, country_id, state_id,
                    city_id, location_id, block_id,
                    gst_number, representative_name,
                    representative_id, phone_number,
                    email_address, registration_details,
                    user_name: loginUsrName,
                    firm_type,
                    admin_user_name: req.username,
                    profile_id,
                    document_id
                }, function (err, result) {
                    if (err) {
                        connection.query('delete from login where username = ?', [loginUsrName], function (err, result) {

                            res.status(401).send({
                                error: true,
                                message: "Error inserting client records."
                            });

                        });
                        return;
                    }
                    res.send({
                        message: 'Successfully added Client Record'
                    });
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
