// Import/require all necessary node-modules
var express = require('express')
var router = express.Router()
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy
var fs = require('fs')
var Grid = require('gridfs-stream')
var mongoose = require('mongoose'); mongoose.set('useCreateIndex', true);

// Import/require all necessary files
const url = require('../functions/url_paths.js')
const addToSitemap = require('../functions/standards.js').addToSitemap
const colors = require('../functions/standards.js').colors
const schema = require('../functions/schema.js')
const Author = schema.Author
const Picture = schema.Picture

// GridFS
var gfs
if (mongoose.connection.readyState==1) {
  console.log(colors.warn("mongoose already connected."))
  gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db)
  setStandartPic("avatar")
  setStandartPic("error")
  setStandartPic("book")
}else{
  // Init stream
  mongoose.connection.once('open', () => {
    gfs = new mongoose.mongo.GridFSBucket(mongoose.connection.db)
    setStandartPic("avatar")
    setStandartPic("error")
    setStandartPic("book")
  })
}

/* Start Passport==================================================================================================
 * ================================================================================================================
 */

// Passport Stuff
passport.serializeUser(function(author, done) {
  done(null, author.id)
})

passport.deserializeUser(function(id, done) {
  Author.findById(id, function(err, author) {
    done(err, author)
  })
})

var registerStrategy = new LocalStrategy({
    usernameField : 'username',
    passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
  },function(req, username, password, done) {
  process.nextTick(function() {
    Author.findOne({username: username}, function(err, author) {
      var authordata = {
        username: req.body.username,
        password: req.body.password,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        about: req.body.about,
        profilePicID: req.body.picid,
        dateSignUp : new Date(),
        language: req.langLow
      }
      if (author || req.body.username.length==0 || req.body.password.length<4 || req.body.username.includes(" ")) {
        return done(null, null, authordata)
      }else{
        var id = mongoose.Types.ObjectId()
        addToSitemap(req.langLow, 'profile?user=', id)
        authordata._id = id
        var newAuthor = new schema.Author(authordata)
        schema.createAuthor(newAuthor, function(err, author) {
          if(err) console.log(err)
        })
        return done(null, newAuthor, authordata)
      }
    })
  })
})

var loginStrategy = new LocalStrategy(function(username, password, done) {
  Author.findOne({username: username}, function(err, author){
    var authordata = {
      username: username,
      password: password
    }
    if (author) {
      schema.comparePassword(password, author.password, function(err, isMatch){
        if(isMatch){
          return done(null, author, authordata)
        }else{
          return done(null, false, authordata)
        }
      })
    }else{
      return done(null, false, authordata)
    }
  })
})

passport.use('local-signup', registerStrategy)
passport.use('local-signin', loginStrategy)

/* Start GET & POST================================================================================================
 * ================================================================================================================
 */

// Picture Handling
router.get(url.blog.pictures, function(req, res) {
  if (req.query.picID[-2]=="#"){
    indexLetter = req.query.picID.slice(-1)
    picUniqueID = req.query.picID.slice(0, -2)
  }else{
    indexLetter = false
    picUniqueID = req.query.picID
  }
  if (picUniqueID=="book") {
    fs.readdir('./public/pics/Landscapes', (err, files) => {
      if (indexLetter) {
        randomIndex = Math.floor(Math.random()*files.length*parseInt(indexLetter)%(files.length-1))
      }else{
        randomIndex = Math.floor(Math.random()*files.length)
      }
      return fs.createReadStream('./public/pics/Landscapes/'+files[randomIndex]).pipe(res)
    })
  }else if (picUniqueID=="avatar"){
    fs.readdir('./public/pics/Avatars', (err, files) => {
      if (indexLetter) {
        randomIndex = Math.floor(Math.random()*files.length*parseInt(indexLetter)%(files.length-1))
      }else{
        randomIndex = Math.floor(Math.random()*files.length)
      }
      return fs.createReadStream('./public/pics/Avatars/'+files[randomIndex]).pipe(res)
    })
  }else{
    var picUniqueID = req.query.picID
    Picture.findOne({uniqueID: picUniqueID}, function(err, pic) {
      if (pic) {
        let picIdInGFS = new mongoose.Types.ObjectId(pic.binData)
        gfs.find({_id: picIdInGFS}).toArray(function (err, docs) {
          if (docs.length)  {
            var readstream = gfs.openDownloadStream(picIdInGFS)
            return readstream.pipe(res)
          }else{
            var readstream = gfs.openDownloadStreamByName("stream-error")
            return readstream.pipe(res)
          }
        })
      }else{
        var readstream = gfs.openDownloadStreamByName("stream-error")
        return readstream.pipe(res)
      }
    })
  }
})

function setStandartPic(name) {
  Picture.findOne({uniqueID: name}, function(err, pic) {
      var streamID = mongoose.Types.ObjectId()
      var writestream = gfs.openUploadStreamWithId(streamID, "stream-"+name)
      fs.createReadStream('./public/pics/Standard/standard-'+name+'.png').pipe(writestream)
      
      if (pic) {
        let picIdInGFS = new mongoose.Types.ObjectId(pic.binData)
        gfs.find({_id: picIdInGFS}).toArray(function (err, found) {
          if (found) {
            gfs.delete(picIdInGFS, function (err) {
              if (err) return false
            })
          }
        })
        picdata = {$set:{
          uniqueID: name,
          binData: streamID,
          dateUploaded: new Date(),
          name: "profile-pic-"+name
        }}
        Picture.updateOne({_id: pic._id}, picdata, function(err) {
          if (err) console.log(err)
        })
        console.log(colors.info("Sucessfully updated picture: " + name))
      }else{
        var newPic = new Picture({
          uniqueID: name,
          binData: streamID,
          dateUploaded: new Date(),
          name: "profile-pic-"+name
        })
        newPic.save()
        console.log(colors.info("Sucessfully saved picture: " + name))
      }
    })
}

module.exports = router
