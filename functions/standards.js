const async = require('async')
const url = require('./url_paths.js')
const { createSitemap } = require('sitemap')
const { Author, Article } = require('../functions/schema.js')

// Sitemap
var urls = [
  {url: '/lang'},
  {url: '/en'},
  {url: '/en/aboutme'},
  {url: '/en/mywork'},
  {url: '/en/blog'},
  {url: '/en/blog/articles'},
  {url: '/en/blog/authors'},
  {url: '/en/blog/login'},
  {url: '/en/blog/register'},
  {url: '/en/contact'}
]

var sitemap = createSitemap({
  hostname: 'https://tobiashoelzer.dynu.net',
  cacheTime: 1000*60*60*24,        // 24h - cache purge period
  urls: urls
})

Article.find({public: true}).exec(function(err, articles) {
  if (err) return false
  articles.forEach(function(article) {
    sitemap.add({url: '/de/blog/articles?article='+article._id})
  })
})

Author.find().exec(function(err, authors) {
  if (err) return false
  authors.forEach(function(author) {
    sitemap.add({url: '/de/blog/profile?user='+author._id})
  })
})

function addToSitemap (lang, type, id) {
  sitemap.add({url: '/'+lang+'/blog/'+type+id})
}

function deleteFromSitemap (lang, type, id) {
  sitemap.del({url: '/'+lang+'/blog/'+type+id})
}

function getXML () {
  return sitemap.toXML()
}

module.exports.addToSitemap = addToSitemap
module.exports.deleteFromSitemap = deleteFromSitemap
module.exports.getXML = getXML

// Colors
const colors = require('colors')

colors.setTheme({
  warn: 'yellow',
  error: 'red',
  fix: 'inverse',
  info: 'grey',
  routine: 'green'
})

module.exports.colors = colors

// Authentication
function eA(req, res, next){
  if(req.isAuthenticated()){
    return next()
  } else {
    let lang = "/"+req.originalUrl.split('/')[1]
    let originalPaths="?path="+req.originalUrl
    res.redirect(lang+url.main.blog+url.blog.login+originalPaths)
  }
}

function eNA(req, res, next){
  if(!req.isAuthenticated()){
    return next()
  } else {
    let lang = "/"+req.originalUrl.split('/')[1]
    res.redirect(lang+url.main.blog)
  }
}

// Ensure its me
function eM(req, res, next){
  var originalPaths="?path="+req.originalUrl
  if(req.isAuthenticated()){
    async.parallel([
      function (cb) {
        Author.findOne({username: "Tobi"}).exec(function(err, me){
          if (!err && me) {cb(null, me)}else{cb(null, false)}
        })
      }, function (cb) {
        Author.findById(req.session.passport.user, function (err, author) {
          if (!err && author) {cb(null, author)}else{cb(null, false)}
        })
      }
    ], function(err, results) {
      if (err) console.log(err)
      if (results[0]&&results[1]) {
        me = results[0]
        loggedUser = results[1]
        if (me._id.toString() == loggedUser._id.toString()) {
          return next()
        }else{
          res.render('MyShit/NotAuth.ejs')
        }
      }else{
        res.redirect('/en'+url.main.blog+url.blog.login+originalPaths)
      }
    })
  } else {
    if (process.env.NODE_ENV != 'production') {
      Author.findOne({username: "Tobi"}).exec(function(err, me){
        if (err) console.log(err)
        if (me) {
          req.logIn(me, function() {
            res.locals.isAuthenticated = req.isAuthenticated()
            if (req.isAuthenticated()) {
              res.locals.userid = req.session.passport.user
            }
            res.locals.url = url
            res.locals.protohost = req.protocol + '://' + req.get('host') + "/"
            res.locals.originalUrl = req.originalUrl
            
            req.langUp = req.originalUrl.split('/')[1].toUpperCase()
            req.langLow = req.originalUrl.split('/')[1].toLowerCase()
            return next()
          })
        }else{
          res.redirect('/en'+url.main.blog+url.blog.login+originalPaths)
        }
      })
    }else{
      res.redirect('/en'+url.main.blog+url.blog.login+originalPaths)
    }
  }
}

module.exports.ensureAuthenticated = eA
module.exports.ensureNotAuthenticated = eNA
module.exports.ensureMe = eM

function proofError (error) {
  if (error) {
    console.log(error)
    return false
  } else {
    return true
  }
}

module.exports.proofError = proofError
