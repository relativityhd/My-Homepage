// Import/require all necessary node-modules
var express = require('express')
var router = express.Router()
var fs = require('fs')

// Import/require all necessary files
const url = require('../functions/url_paths.js')
const ensureMe = require('../functions/standards.js').ensureMe

// Start with the GETs. If somebody requests a url, he gets back a view-file.
router.get(url.myshit.route, ensureMe, function(req, res) {
  res.render('MyShit/Home')
})

router.get(url.myshit.passwordgen, ensureMe, function(req, res) {
  res.render('MyShit/PasswordGen')
})

router.get(url.myshit.feelings, ensureMe, function(req, res) {
  res.render('MyShit/Feelings')
})

router.get(url.myshit.playground, ensureMe, function(req, res) {
  res.render('MyShit/Playground')
})
module.exports = router
