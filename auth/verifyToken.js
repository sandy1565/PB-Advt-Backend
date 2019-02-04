
const jwt = require('jsonwebtoken');
const config = require('../config');

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
		next();
	});
}

const authJwt = {};
authJwt.verifyToken = verifyToken;

module.exports = authJwt;