var express = require('express')
  , router = express.Router();

/* GET home page. */
router.get('/ping/:id', function(req, res, next) {
  res.render('index', { title: 'Driver upstream' });
});

module.exports = router;
