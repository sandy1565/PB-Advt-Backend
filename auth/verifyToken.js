
const jwt = require('jsonwebtoken');
const config = require('../config');

var connection = require('../db.connection');

verifyToken = (req, res, next) => {
	let token = req.headers['x-access-token'];
	
	if (!token){
		return res.status(403).json({ 
			auth: false, message: 'No token provided.' 
		});
	}

	jwt.verify(token, config.secret, (err, decoded) => {
		if (err){
			return res.status(500).json({ 
					auth: false, 
					message: 'Fail to Authentication. Error -> ' + err 					
				});
        }
				req.username = decoded.username;
				connection.query('select type_of_user from login where username=?',[req.username],function(err,results){
					if(err || !results[0]){
						res.status(500).json({ 
							auth: false, 
							message: 'Fail to Authentication. Error -> ' + err 
						});
					}
					console.log(results);
					req.type_of_user = results[0].type_of_user;
					next();
				});
				
	});
}

const authJwt = {};
authJwt.verifyToken = verifyToken;

module.exports = authJwt;