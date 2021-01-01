// Import/require all necessary node-modules
const MongoClient = require('mongodb').MongoClient

//Import/require all necessary files
const url = require('../functions/url_paths.js')

// Create global var _db, which will be exported
var _db

// Define URI of the Database
// This is for local testing
// const uri = 'mongodb://'+ url.adress.local +':27017/MyHomepage'
const uri = url.adress.db

// The export function
// The server will connect *once* and just give back the _db value
module.exports = {
  connect: function(cb) {
    MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }, function(err, db) {
      _db=db
      return cb(err)
    })
  },
  getDb: function() {
    return _db
  }
}
