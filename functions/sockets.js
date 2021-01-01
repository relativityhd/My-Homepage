// Import/require all necessary node-modules
var fs = require('fs')
var uniqid = require('uniqid')
var Grid = require('gridfs-stream')
var mongoose = require('mongoose'); mongoose.set('useCreateIndex', true);
var async = require('async')

// Import/require all necessary files
const schema = require('../functions/schema.js')
const { ServerData, Article, Author, Picture, PasswordGen, Feelings } = schema

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
function secureGridDelete(id) {
  let idInGFS = new mongoose.Types.ObjectId(id)
  gfs.find({_id: idInGFS}).toArray(function (err, found) {
    console.log(found)
    if (found) {
      gfs.delete(idInGFS, function (err) {
        if (err) return false
      })
    }
  })
}

var visitors
ServerData.findOne({name: "myHomepage"}, function(err, data) {
  visitors = data ? data.visitors : 0
})

/* Start SocketIO==================================================================================================
 * ================================================================================================================
 */

function ioSockets (socket) {
  // Searches =====================================================================================================
  // Authors
  socket.on("searchAuthorRequest", function(data) {
    var word = data.word
    if (word!="") {
      async.parallel([
        function (cb) {
          Author.find({username: {"$regex": word, "$options": "i"}}).populate('author').exec(function(err, authors) {
            cb(null, authors)
          })
        },function (cb) {
          Author.find({firstname: {"$regex": word, "$options": "i"}}).populate('author').exec(function(err, authors) {
            cb(null, authors)
          })
        },function (cb) {
          Author.find({lastname: {"$regex": word, "$options": "i"}}).populate('author').exec(function(err, authors) {
            cb(null, authors)
          })
        }
      ], function(err, res) {
        var authors = []
        var ids = []
        res.forEach(cbfunc => {
          cbfunc.forEach(author => {
            if (!ids.includes(String(author._id))) {
              ids.push(String(author._id))
              authors.push(author)
            }
          })
        })
        socket.emit("searchAuthorResult", {authors: authors})
      })
    }else{
      Author.find().populate('articles').exec(function(err, authors) {
        socket.emit("searchAuthorResult", {authors: authors})
      })
    }
  })

  // Articles
  socket.on("searchArticleRequest", function(data) {
    var word = data.word
    if (word!="") {
      async.parallel([
        function (cb) {
          var arts = []
          Article.find({}).populate('author').exec(function(err, articles) {
            articles.forEach(function(article) {
              var lower = word.toLowerCase()
              if (article.author.firstname.toLowerCase().includes(lower) || article.author.username.toLowerCase().includes(lower) || article.author.lastname.toLowerCase().includes(lower)) {
                arts.push(article)
              }
            })
            cb(null, arts)
          })
        },function (cb) {
          Article.find({title: {"$regex": word, "$options": "i"}}).populate('author').exec(function(err, articles) {
            cb(null, articles)
          })
        },function (cb) {
          Article.find({subtitle: {"$regex": word, "$options": "i"}}).populate('author').exec(function(err, articles) {
            cb(null, articles)
          })
        },function (cb) {
          Article.find({tags: {"$regex": word, "$options": "i"}}).populate('author').exec(function(err, articles) {
            cb(null, articles)
          })
        }
      ], function(err, res) {
        var articles = []
        var ids = []
        res.forEach(cbfunc => {
          cbfunc.forEach(article => {
            if (!ids.includes(String(article._id))&&article.public) {
              ids.push(String(article._id))
              articles.push(article)
            }
          })
        })
        articles.sort(function (a, b) {
          return (new Date(b.date) - new Date(a.date))
        })
        socket.emit("searchArticleResult", {articles: articles})
      })
    }else{
      Article.find().populate('author').exec(function(err, articles) {
        socket.emit("searchArticleResult", {articles: articles})
      })
    }
  })



  // Visitor Counter ==============================================================================================
  // Overall
  socket.on("addVisitor", function(data) {
    if (data.valid==true) {
      if (visitors || visitors==0) {
        visitors++
        ServerData.updateOne({name: "myHomepage"}, {$set: {visitors: visitors}}, function (err) {if (err) console.log(err)})
      }
    }
  })

  // Articles
  socket.on("addArticleVisitor", function(data) {
    Article.findById(data.id, function(err, article) {
      if (err) console.log(err)
      if (!article) return false
      var v = article.visitors+1
      Article.updateOne({_id: article._id}, {$set: {visitors: v}}, function(err) {if (err) console.log(err)})
    })
  })



  // Picture Upload ===============================================================================================
  socket.on("uploadImage", function(data) {
    if (data.uniqueID == 0 || ["avatar", "book", "error"].includes(data.uniqueID)){
      uniqueID = uniqid(data.typeCode)
      socket.emit("uniqueCode", {code: uniqueID})
    }else{
      uniqueID = data.uniqueID
    }

    Picture.findOne({uniqueID: uniqueID}, function(err, pic) {
      var streamID = mongoose.Types.ObjectId()
      base64Image = data.src.split(';base64,').pop()
      fs.writeFile('./public/uploads/'+streamID+'.png', base64Image, {encoding: 'base64'}, function(err) {
        if (err) {
          console.log(err)
          return false
        }
        var writestream = gfs.openUploadStreamWithId(streamID, "stream-"+uniqueID)
        var stream = fs.createReadStream('./public/uploads/'+streamID+'.png').pipe(writestream)
        stream.on('finish', function () {
          fs.unlink('./public/uploads/'+streamID+'.png', (err) => {console.log(err)})
        })
        
        if (pic) {
          secureGridDelete(pic.binData)
          picdata = {$set:{
            uniqueID: uniqueID,
            binData: streamID,
            dateUploaded: new Date(),
            name: "pic-"+uniqueID
          }}
          Picture.updateOne({_id: pic._id}, picdata, function(err) {
            if (err) console.log(err)
          })
        }else{
          var newPic = new Picture({
            uniqueID: uniqueID,
            binData: streamID,
            dateUploaded: new Date(),
            name: "pic-"+uniqueID
          })
          newPic.save()
        }
      
        if (!err) {
          socket.emit("picSaved", {messageDE: "Bild gespeichert...", messageEN: "Picture saved..."})
        }
      })
    })
  })

  socket.on("leavedImage", function(data){
    var uniqueID = data.id
    if (uniqueID!="0"&&uniqueID!=0) {
      Picture.findOne({uniqueID: uniqueID}, function(err, pic) {
        if (pic) {
          secureGridDelete(pic.binData)
          Picture.deleteOne({_id: pic._id}, function (err) {if (err) return false})
        }
      })
    }
  })



  // Login, Register, Profile======================================================================================

  // Update Author Imgage
  socket.on("updateAuthorImage", function(data) {
    Author.updateOne({_id: data.id}, {$set:{profilePicID: data.uniqueID}}, function(err){if (err) console.log(err)})
  })

  // Register Username Validation
  socket.on("registerRequestUsernameValidation", function(data) {
    Author.findOne({username: data.username}, function(err, author) {
        if (author) {
        socket.emit("registerResponseUsernameValidation", {valid: false})
        }else{
        socket.emit("registerResponseUsernameValidation", {valid: true})
        }
    })
  })
  
  // Login Username Validation
  socket.on("loginRequestUsernameValidation", function(data) {
    Author.findOne({username: data.username}, function(err, author) {
      if (author) {
        socket.emit("loginResponseUsernameValidation", {valid: true})
      }else{
        socket.emit("loginResponseUsernameValidation", {valid: false})
      }
    })
  })
  
  // Login Password Validation
  socket.on("loginRequestPasswordValidation", function(data) {
    Author.findOne({username: data.username}, function(err, author) {
      if (author) {
        schema.comparePassword(data.password, author.password, function(err, isMatch) {
          if (isMatch) {
            socket.emit("loginResponsePasswordValidation", {valid: true})
          }else{
            socket.emit("loginResponsePasswordValidation", {valid: false})
          }
        })
      }else{
        socket.emit("loginResponsePasswordValidation", {valid: false})
      }
    })
  })

  // Profile Username Validation
  socket.on("profileRequestUsernameValidation", function(data) {
    Author.findOne({username: data.username}, function(err, author) {
      if (author) {
        socket.emit("profileResponseUsernameValidation", {valid: false})
      }else{
        socket.emit("profileResponseUsernameValidation", {valid: true})
      }
    })
  })

  // Profile Password Validation
  socket.on("profileRequestPasswordValidation", function(data) {
    Author.findOne({username: data.username}, function(err, author) {
      if (author) {
        schema.comparePassword(data.password, author.password, function(err, isMatch) {
          if (isMatch) {
            socket.emit("profileResponsePasswordValidation", {valid: true})
          }else{
            socket.emit("profileResponsePasswordValidation", {valid: false})
          }
        })
      }else{
        socket.emit("profileResponsePasswordValidation", {valid: false})
      }
    })
  })



  // Passwort Generator ===========================================================================================
  socket.on("requestPasswordData", function(data) {
    PasswordGen.find({user: data.userid}).sort('number').exec(function(err, pws) {
      if (err) console.log(err)
      socket.emit("responsePasswordData", {pws: pws})
    })
  })

  socket.on("savePasswordData", function(data) {
    pw = data.pw
    var pwdata = new PasswordGen({
      number: pw.number,
      user: data.userid,
      mode: pw.mode,
      comp: pw.comp,
      key: pw.key,
      pin: pw.pin,
      acc: pw.acc,
      type: pw.type,
      spec: pw.spec,
      year: pw.year,
      min: pw.min,
      max: pw.max
    })
    pwdata.save()
  })

  socket.on("deletePasswordData", function(data) {
    PasswordGen.deleteOne({user: mongoose.Types.ObjectId(data.userid), number: data.number}, function (err) {if (err) return false})
    PasswordGen.find({user: data.userid}).sort('number').exec(function(err, pws) {
      if (err) console.log(err)
      pws.forEach(function(pw) {
        if (pw.number > data.number)
        PasswordGen.updateOne({_id: pw._id}, {$inc: {number: -1,}}, function(err) {
          if (err) console.log(err)
        })
      })
    })
  })

  socket.on("passwordRequestSearch", function(data) {
    PasswordGen.find({comp: { $regex: ".*"+data.search+".*", $options: 'i' }}).exec(function(err, pws) {
      if (err) console.log(err)
      pwInfos = {}
      pws.forEach((pw) => {
        pwInfos[pw._id] = pw
      })
      socket.emit("passwordResponseSearch", pwInfos)
    })
  })



  // Feelings =====================================================================================================
  socket.on("requestFindFeelings", function(data) {
    if (data.query && data.response) {
      try{
      Feelings.find(data.query, (e, feelings) => {
        socket.emit(data.response, !e ? feelings : e)
      })} catch (e) {socket.emit(data.response, e)}
    }
  })

  socket.on("requestAggregateFeelings", function(data) {
    if (data.query && data.response) {
      if (data.query[0]) { if (data.query[0].$match) {
        for (let key in data.query[0].$match) {
          data.query[0].$match[key] = new mongoose.Types.ObjectId(data.query[0].$match[key])
        }
      }}
      try{
      Feelings.aggregate(data.query, (e, feelings) => {
        socket.emit(data.response, !e ? feelings : e)
      })}catch (e) {socket.emit(data.response, e)}
    }
  })

  socket.on("requestCountFeelings", function(data) {
    async.parallel([
      (cb) => {
        Feelings.countDocuments({user: data.userid, feeling: 0}, (e, count) => {
          cb(null, count)
        })
      },(cb) => {
        Feelings.countDocuments({user: data.userid, feeling: 1}, (e, count) => {
          cb(null, count)
        })
      },(cb) => {
        Feelings.countDocuments({user: data.userid, feeling: 2}, (e, count) => {
          cb(null, count)
        })
      },(cb) => {
        Feelings.countDocuments({user: data.userid, feeling: 3}, (e, count) => {
          cb(null, count)
        })
      },(cb) => {
        Feelings.countDocuments({user: data.userid, feeling: 4}, (e, count) => {
          cb(null, count)
        })
      },
    ], (err, results) => {
      let data = {
        "Very bad": results[0],
        "Bad": results[1],
        "Neutral": results[2],
        "Good": results[3],
        "Great": results[4],
      }
      socket.emit("responseCountFeelings", data)
    })
  })

  socket.on("registerFeeling", function(data) {
    let userid = data.userid
    let feeling = data.feeling
    let date = data.date || new Date()

    let feelingData = new Feelings({
      user: userid,
      date: date,
      feeling: feeling
    })
    feelingData.save((e) => {
      if (e) socket.emit("savedFeeling", false)
      if (!e) socket.emit("savedFeeling", true)
    })
  })

  socket.on("deleteFeeling", function(data) {
    Feelings.deleteOne({_id: new mongoose.Types.ObjectId(data.id)}, function (err) {
      if (err) {
        if (data.response) {
          socket.emit(data.response, false)
        }
        return false
      }
      if (data.response) {
        socket.emit(data.response, true)
      }
    })
  })
}

module.exports = ioSockets
