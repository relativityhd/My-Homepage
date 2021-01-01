var express = require('express')
var router = express.Router()

const getXML = require('../functions/standards.js').getXML

router.get(['/sitemap.xml', '/sitemap1.xml', '/mysitemap.xml', '/tsitemap.xml'], function(req, res) {
  try {
    const xml = getXML()
    res.header('Content-Type', 'application/xml');
    res.send( xml );
    res.end()
  } catch (e) {
    res.render('Error.ejs')
  }
})

router.get('/robots.txt', function (req, res) {
  res.type('text/plain');
  res.header('Content-Type', 'text/plain')
  res.send("User-agent: *\nAllow: /\n\nSitemap: http://tobiashoelzer.dynu.net/sitemap.xml");
})

module.exports = router
