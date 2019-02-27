var express = require('express');
var router = express.Router();
var connection = require('./db.connection');
const authJwt = require('./auth/verifyToken');
// [authJwt.verifyToken]
router.get("/:id", function (req, res) {
    // const query = 'select * from advt_publish_log where '
    res.send("workgin");
});

module.exports = router;