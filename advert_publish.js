module.exports =  function publish(advert ){
    if(advert.status == 'unapproved'){
        return;
    }
    connection.query("select * from PUBLISH_DATE where advt_id = ?", [advert.advt_id], function (err, rows) {
        if (err || !rows || !rows[0]) {

            return;
        }
        rows.forEach(row => {
            if(row.status == 'published'){
                return;
            }
           
            let fromPublishDate = new Date(row.from_publish_date);
            let toPublishDate = new Date(row.to_publish_Date);

            let allEmails = [];
            if (fromPublishDate.getDate() == today.getDate() &&
            fromPublishDate.getMonth() == today.getMonth() &&
            fromPublishDate.getFullYear() == today.getFullYear() &&
            ((fromPublishDate.getHours() > today.getHours() && 
            toPublishDate.getHours() < today.getHours()) ?true: (fromPublishDate.getMinutes() > today.getMinutes() && 
            toPublishDate.getMinutes() < today.getMinutes())
            )) {
                connection.query("update  PUBLISH_DATE set status = ? where advt_id = ?", 
                ['published',advert.advt_id],function(){

                });
                let selectedPersons = allPersons.filter(person => {

                    return (
                        advert.age_from <= person.age && person.age <= advert.age_to
                    );
                });
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
                                from_publish_date,
                                to_publish_Date,
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
                            from_publish_date,
                            to_publish_Date,
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
                                from_publish_date,
                                to_publish_Date,
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


};