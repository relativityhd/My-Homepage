// Import/require all necessary node-modules
var express = require('express')
var router = express.Router()
var passport = require('passport')
var async = require('async')
var Grid = require('gridfs-stream')
var mongoose = require('mongoose'); mongoose.set('useCreateIndex', true);
var stream = require('stream')

// Import/require all necessary files
const url = require('../functions/url_paths.js')
const schema = require('../functions/schema.js')
const Article = schema.Article
const Author = schema.Author
const Picture = schema.Picture
const { addToSitemap, deleteFromSitemap, ensureAuthenticated, ensureNotAuthenticated } = require('../functions/standards.js')

// Article Buffer, if somebody writes something without saving
let articleBuffer = {}

// GridFS
var gfs
if (mongoose.connection.readyState==1) {
  gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db)
}else{
  // Init stream
  mongoose.connection.once('open', () => {
    gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db)
  })
}

// Secure Grid Delete Function
async function secureGridDelete(id) {
  let idInGFS = new mongoose.Types.ObjectId(id)
  gfs.find({_id: idInGFS}).toArray(function (err, found) {
    if (found) {
      gfs.delete(idInGFS, function (err) {
        if (err) return false
      })
    }
  })
}

/* =========================================================================================================
 * Start===================================================================================================
 * =========================================================================================================
 */
// Blog
router.get(url.blog.route, function(req, res) {
  async.parallel([
    function (cb) {
      Author.find({}).exec(function(err, authors) {
        if (err) {
          console.log(err)
          cb(err, [])
        }else{
          cb(null, authors)
        }
      })
    },function (cb){
      Article.find({public: true}).populate('author').sort('-date').exec(function(err, articles) {
        if (err) {
          console.log(err)
          cb(err, [])
        }else{
          if (articles.length>=4) {
            articles = articles.slice(0, 4)
          }
          cb(null, articles)
        }
      })
    }, function (cb) {
      if (req.session.passport) {
        Author.findById(req.session.passport.user, function (err, author) {
          if (err) {
            console.log(err)
            cb(err, false)
          }else{
            if (author) {
              cb(null, author)
            }else{
              cb(null, false)
            }
          }
        })
      }else{
        cb(null, false)
      }
    }, function (cb) {
      Author.findOne({username: "Tobi"}).exec(function(err, me){
        if (err) {
          console.log(err)
          cb(err, false)
        }else{
          if (me) {
            cb(null, me)
          }else{
            cb(null, false)
          }
        }
      })
    }
  ], function(err, results) {
    if (err) console.log(err)
    return res.render(req.langUp+'/Blog', {
      authors: results[0],
      articles: results[1],
      user: results[2],
      me: results[3]
    })
  })
})

/* =========================================================================================================
 * Articles=================================================================================================
 * =========================================================================================================
 */

// All and Spezific Articles
router.get(url.blog.articles, function (req, res) {
  if (req.query.article) {
    Article.findById(req.query.article).populate('author').exec(function(err, article) {
      var sessionID = false
      if (req.session.passport) sessionID=req.session.passport.user
      if (article) {
        let articleIdInGFS = new mongoose.Types.ObjectId(article.quilljs)
        gfs.find({_id: articleIdInGFS}).toArray(function(err, found) {
          if (found) {
            var buf = new Buffer('')
            var s = gfs.openDownloadStream(articleIdInGFS)
            s.on('data', (chunk) => {
              buf = Buffer.concat([buf, chunk])
            })
            s.on('end', () => {
              article.quilljs = buf.toString().replace(/<\/script>/g, "< /script >")
              buf = null // Clean up memory
              s.destroy()
              return res.render(req.langUp+'/Blog/Article', {
                article: article,
                isAuthor: (sessionID==article.author._id)
              })
            })
          }else{
            return res.redirect('/'+req.langLow+url.main.blog+url.blog.articles)
          }
        })
      }else{
        return res.redirect('/'+req.langLow+url.main.blog+url.blog.articles)
      }
    })
  }else{
    Article.find().populate('author').sort('-date').exec(function(err, articles) {
      return res.render(req.langUp+'/Blog/ArticlesOverview', {
        articles: articles
      })
    })
  }
})

// Write Blog
router.get(url.blog.write, ensureAuthenticated, function (req, res){
  Author.findById(req.session.passport.user, function (err, author) {
    if (req.query.article) {
      Article.findById(req.query.article, function (err, article) {
        if (article) {
          if (req.session.passport.user==article.author) {
            let articleIdInGFS = new mongoose.Types.ObjectId(article.quilljs)
            gfs.find({_id: articleIdInGFS}).toArray(function(err, found) {
              if (found) {
                var buf = new Buffer('')
                var s = gfs.openDownloadStream(articleIdInGFS)
                s.on('data', (chunk) => {
                  buf = Buffer.concat([buf, chunk])
                })
                s.on('end', () => {
                  article.quilljs = buf.toString().replace(/<\/script>/g, "< /script >")
                  buf = null // Clean up memory
                  s.destroy()
                  return res.render(req.langUp+'/Blog/Write', {
                    author: author,
                    article: article
                  })
                })
              }else{
                return res.redirect('/'+req.langLow+url.main.blog+url.blog.write)
              }
            })
          }else{
            return res.redirect('/'+req.langLow+url.main.blog+url.blog.articles+'?article='+req.query.article)
          }
        }else{
          return res.redirect('/'+req.langLow+url.main.blog+url.blog.write)
        }
      })
    }else{
      if (articleBuffer[req.session.passport.user]) {
        return res.render(req.langUp+'/Blog/Write', {
          author: author,
          article: articleBuffer[req.session.passport.user]
        })
      }else{
        return res.render(req.langUp+'/Blog/Write', {
          author: author,
          article: false
        })
      }
    }
  })
})

router.post(url.blog.write, function (req, res){
  
  var public
  if (req.body.public) {
    public=true
  }else{
    public=false
  }
  if (req.isAuthenticated()) {
    Author.findById(req.session.passport.user, function (err, author) {

      if (req.body.title.length>=3 && req.body.title.length<=50 && req.body.subtitle.length>=10 && req.body.subtitle.length<=120 &&
        req.body.length>=256 && JSON.parse(req.body.tagjson).length <= 4 && author) {
        
        var streamID = mongoose.Types.ObjectId()
        var writestream = gfs.openUploadStreamWithId(streamID, "stream-article-"+req.body.title)
        var s = new stream.Readable();
        s.push(req.body.article.replace(/<\/script>/g, "< /script >"))
        s.push(null)
        s.pipe(writestream)

        var tags = JSON.parse(req.body.tagjson)
        
        if (req.query.article) {
          Article.findById(req.query.article, function(err, article) {
            if (article) {
              secureGridDelete(article.quilljs)

              var articledata = {$set:{
                title: req.body.title,
                subtitle: req.body.subtitle,
                quilljs: streamID,
                updated: new Date(),
                public: public,
                tags: tags,
                articlePicID: req.body.picid
              }}
              Article.updateOne({_id: req.query.article}, articledata, function(err) {
                if (err) console.log(err)
              })
            }
            articleBuffer[req.session.passport.user] = false
            return res.redirect('/'+req.langLow+url.main.blog+url.blog.articles+'?article='+req.query.article)
          })
        }else{
          var id = mongoose.Types.ObjectId()
          addToSitemap(req.langLow, 'articles?article=', id)
          var article = new Article({
            _id: id,
            title: req.body.title,
            subtitle: req.body.subtitle,
            date: new Date(),
            updated: new Date(),
            lang: req.langLow,
            quilljs: streamID,
            public: public,
            tags: tags,
            author: author._id,
            articlePicID: req.body.picid
          })
          article.save()

          author.articles.push(article._id)
          var authordata = {$set:{
            articles: author.articles
          }}
          Author.updateOne({_id: author._id}, authordata, function(err) {
            if (err) console.log(err)
          })
          
          articleBuffer[req.session.passport.user] = false
          return res.redirect('/'+req.langLow+url.main.blog+url.blog.articles+'?article='+article._id)
        }
      }else{
        return res.render(req.langUp+'/Blog/Write', {
          article: {
            title: req.body.title,
            subtitle: req.body.subtitle,
            quilljs: req.body.article,
            public: public
          }
        })
      }
    })
  }else{
    let authorid = req.body.authorid
    articleBuffer[authorid] = {
      title: req.body.title,
      subtitle: req.body.subtitle,
      quilljs: req.body.article,
      public: public
    }
    let lang = "/"+req.originalUrl.split('/')[1]
    let originalPaths="?path="+req.originalUrl
    return res.redirect(lang+url.main.blog+url.blog.login+originalPaths)
  }
})

router.get(url.blog.delarticle, ensureAuthenticated, function(req, res) {
  Author.findById(req.session.passport.user, function (err, author) {
    Article.findById({_id: req.query.article}, function(err, article) {
      if (author._id.toString()==article.author.toString()) {
        author.articles.splice(author.articles.indexOf(article._id), 1)
        var authordata = {$set:{
          articles: author.articles
        }}
        Author.updateOne({_id: author._id}, authordata, function(err) {if (err) console.log(err)})
        var picID = article.articlePicID
        if (picID!="book") {
          Picture.findOne({uniqueID: picID}, function(err, pic) {
            var binData = pic.binData
            secureGridDelete(binData)
            Picture.deleteOne({_id: mongoose.Types.ObjectId(pic._id)}, function (err) {if (err) return false})
          })
        }
        var quilljs = article.quilljs
        secureGridDelete(quilljs)
        deleteFromSitemap(req.langLow, 'articles?article=', article._id)
        Article.deleteOne({_id: mongoose.Types.ObjectId(article._id)}, function (err) {if (err) return false})
        res.redirect('/'+req.langLow+url.main.blog+url.blog.profile)
      }else{
        res.redirect('/'+req.langLow+url.main.blog+url.blog.articles+'?article='+req.query.article)
      }
    })
  })
})

/* =========================================================================================================
 * Profile==================================================================================================
 * =========================================================================================================
 */

// All Authors
router.get(url.blog.authors, function (req, res) {
  Author.find().populate('articles').exec(function(err, authors) {
    return res.render(req.langUp+'/Blog/AuthorsOverview', {
      authors: authors
    })
  })
})

// Author Profile (Spezific)
router.get(url.blog.profile, function (req, res) {
  // query == passport === !query && passport -> print self
  // query && passport === query && !passport -> just print user
  // !query && !passport -> Login?
  var sessionID
  if (req.session.passport) sessionID=req.session.passport.user
  if ((sessionID&&sessionID==req.query.user) || (!req.query.user&&sessionID)) {
    Author.findById(req.session.passport.user).populate('articles').exec(function(err, author) {
      return res.render(req.langUp+'/Blog/Profile', {
        author: author,
        isUser: true,
        edit: req.query.edit
      })
    })
  }else if (req.query.user) {
    Author.findById(req.query.user).populate('articles').exec(function(err, author) {
      return res.render(req.langUp+'/Blog/Profile', {
        author: author,
        isUser: false
      })
    })
  }else{
    return res.redirect('/'+req.langLow+url.main.blog+url.blog.login+'?path='+'/'+req.langLow+url.main.blog+url.blog.profile)
  }
})

router.post(url.blog.profile, ensureAuthenticated, function (req, res) {
  if (req.query.user==req.session.passport.user) {
    Author.findById(req.query.user).exec(function(err, author) {
      var authordata = {$set:{
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        about: req.body.about
      }}
      schema.comparePassword(req.body.password_old, author.password, function(err, isMatch) {
        if (err) console.log(err)
        if ((author && isMatch) || (req.body.password_old==""&&req.body.password=="")) {
          if (req.body.password.length>=4) {
            schema.updatePassword(req.body.password)
          }
          Author.updateOne({_id:req.query.user}, authordata, function(err, res) {
              if (err) console.log(err)
          })
          res.redirect('/'+req.langLow+url.main.blog+url.blog.profile+'?user='+req.session.passport.user+'&edit=true')
        }else{
          res.redirect('/'+req.langLow+url.main.blog+url.blog.profile+'?user='+req.session.passport.user+'&edit=false')
        }
      })
    })
  }else{
    res.redirect('/'+req.langLow+url.main.blog+url.blog.profile+'?user='+req.session.passport.user+'&edit=false')
  }
})

/* =========================================================================================================
 * Registration & Login=====================================================================================
 * =========================================================================================================
 */

// Author Registration
router.get(url.blog.register, ensureNotAuthenticated, function (req, res){
  return res.render(req.langUp+'/Blog/Register', {
    err: false,
    data: {}
  })
})

router.post(url.blog.register, ensureNotAuthenticated, function(req, res, next){
  // Passport Strategies are set in blog.js
  passport.authenticate('local-signup', {}, function(err, author, data) {
    if (author) {
      req.logIn(author, function() {
        return res.render(req.langUp+'/Blog/Register', {
          err: "success",
          data: data,
          author: author
        })
      })
    }else {
      return res.render(req.langUp+'/Blog/Register', {
        err: true,
        data: data
      })
    }
  })(req, res, next)
})


//Author Login and Logout
router.get(url.blog.login, ensureNotAuthenticated, function (req, res){
  // For nice redirect to original requested site.
  var originalPath=req.query.path
  if (!originalPath) {
    originalPath='/'+req.langLow+url.main.blog
  }
  
  return res.render(req.langUp+'/Blog/Login', {
    err: false,
    data: {},
    path: originalPath
  })
})

router.post(url.blog.login, ensureNotAuthenticated, function (req, res, next){
  // For nice redirect to original requested site.
  var originalPath=req.query.path
  if (!originalPath) {
    originalPath='/'+req.langLow+url.main.blog
  }
  
  // Passport Strategies are set in blog.js
  passport.authenticate('local-signin', {}, function(err, author, data) {
    if (err || !author) {
      return res.render(req.langUp+'/Blog/Login', {
        err: true,
        data: data,
        path: originalPath
      })
    }else{
      req.logIn(author, function() {
        return res.redirect(originalPath)
      })
    }
  })(req, res, next)
})

router.get(url.blog.logout, ensureAuthenticated, function (req, res){
  req.logout()
  return res.redirect('/'+req.langLow+url.main.blog)
})

router.get(url.blog.delprofile, ensureAuthenticated, function(req, res){
  var sessionID = req.session.passport.user
  req.logout()
  async.waterfall([
    function (cb) {
      Author.findById(sessionID).populate('articles').exec(function(err, author) {
        var picID = author.profilePicID
        if (picID!="avatar") {
          Picture.findOne({uniqueID: picID}, function(err, pic) {
            var binData = pic.binData
            secureGridDelete(binData)
            Picture.deleteOne({_id: mongoose.Types.ObjectId(pic._id)}, function (err) {if (err) return false})
          })
        }
        author.articles.forEach(article => {
          var picID = article.articlePicID
          if (picID!="avatar") {
            Picture.findOne({uniqueID: picID}, function(err, pic) {
              var binData = pic.binData
              secureGridDelete(binData)
              Picture.deleteOne({_id: mongoose.Types.ObjectId(pic._id)}, function (err) {if (err) return false})
            })
          }
          var quilljs = article.quilljs
          secureGridDelete(quilljs)
          Article.deleteOne({_id: mongoose.Types.ObjectId(article._id)}, function (err) {if (err) return false})
        })
        cb(null)
      })
    },
    function (cb) {
      deleteFromSitemap(req.langLow, 'profile?user=', author._id)
      Author.deleteOne({_id: mongoose.Types.ObjectId(sessionID)}, function (err) {if (err) return false})
      cb(null)
    }
  ])
  return res.redirect('/'+req.langLow+url.main.blog)
})


module.exports = router
