var mongoose = require('mongoose'); mongoose.set('useCreateIndex', true);
var bcrypt = require('bcryptjs')

const url = require('../functions/url_paths.js')

mongoose.connect(url.adress.db, { useNewUrlParser: true, useUnifiedTopology: true })

var ServerSchema = new mongoose.Schema({

  name: {type: String, unique: true},
  visitors: Number,
  setupDate: {type: Date, default: new Date()}

})

var PasswordSchema = new mongoose.Schema({

  user: {type: mongoose.Schema.Types.ObjectId, ref: 'Author'},
  number: Number,
  mode: Boolean,
  comp: String,
  key: String,
  pin: String,
  acc: String,
  type: String,
  spec: String,
  year: String,
  min: String,
  max: String

})

var FeelingsSchema = new mongoose.Schema({

  user: {type: mongoose.Schema.Types.ObjectId, ref: 'Author'},
  date: Date,
  feeling: {type: Number, default: 2}

})

var ArticleSchema = new mongoose.Schema({

  title: String,
  subtitle: String,
  date: Date,
  updated: Date,
  lang: String,
  quilljs: String,
  public: Boolean,
  articlePicID: String,
  visitors: {type: Number, default: 0},
  tags: [String],
  author: {type: mongoose.Schema.Types.ObjectId, ref: 'Author'}

})

var AuthorSchema = new mongoose.Schema({

  username: {
    type: String,
    index: true,
    unique: true,
    trim: true
  },
  password: String,
  google: {
    id: String,
    token: String,
    email: String,
    name: String
  },
  googleId: {
    type: String
  },
  firstname: String,
  lastname: String,
  about: String,
  language: String,
  profilePicID: String,
  dateSignUp: Date,
  articles: [{type: mongoose.Schema.Types.ObjectId, ref: 'Article'}]

})

var PictureSchema = new mongoose.Schema({
  
  uniqueID: {
    type: String,
    index: true,
    unique: true,
    trim: true
  },
  binData: String,
  dateUploaded: Date,
  name: String
  
})

var ServerData = mongoose.model('Server', ServerSchema)
var PasswordGen = mongoose.model('PasswordGen', PasswordSchema)
var Feelings = mongoose.model('Feeling', FeelingsSchema)
var Article = mongoose.model('Article', ArticleSchema)
var Author = mongoose.model('Author', AuthorSchema)
var Picture = mongoose.model('Picture', PictureSchema)

module.exports = { ServerData, PasswordGen, Feelings, Article, Author, Picture }

module.exports.createAuthor = function(newAuthor, callback) {
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(newAuthor.password, salt, function(err, hash) {
      newAuthor.password = hash
      newAuthor.save(callback)
    })
  })
}

module.exports.updatePassword = function(authorID, newPassword, callback) {
  Author.findById(authorID, function (err, author) {
    if (!err) {
      bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(newPassword, salt, function(err, hash) {
          Author.updateOne({_id: author._id}, {password: hash}, function (err) {
            callback(err)
      })})})
    }
  })
}

module.exports.comparePassword = function(candidatePassword, hash, callback) {
  bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
    if (err) throw err
    callback(null, isMatch)
  })
}
