// Import/require all necessary node-modules
require('dotenv').config()
const express = require('express')
const app = express()
const https = require('https')
const http = require('http')
const socketio = require('socket.io')
const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser')
const expressValidator = require('express-validator');
const session = require('express-session')
const passport = require('passport')
const clear = require('clear')
const async = require('async')

// Import/require all necessary files
const db_connection = require('./functions/db_connection.js')
const url = require('./functions/url_paths.js')
const colors = require('./functions/standards.js').colors
const schema = require('./functions/schema.js')
const ServerData = schema.ServerData

// Variable for counting the connection requests
var connectionTries = 0

function init (err) {
  
  // Clears console at app start
  clear()
  console.log()
  console.log(colors.routine(' $$ Start WebApp... $$\n'))
  connectionTries++
  
  // Check if connected successfully to the database
  // Tries after 10 sec. another time to connect
  if (err) {
    console.log(' There was an error while connecting to database: \n',
                colors.error(err))
    console.log('\n Could not connect to database! Try Nr. : ', 
                connectionTries)
    console.log(' Wait for connection...')
    setTimeout(function () {
      db_connection.connect(function(err) {
        init(err)
      })
    }, 10000)
    return
  }
  console.log(colors.routine(' Connected successfully after ' +
              connectionTries + ' tries to database!'))

  // How to create a self-signed (not trustworthy) SSL certificate on windows:
  //  faqforge.com/windows/use-openssl-on-windows
  // For trustworthy SSL certificate use:
  //  zerossl.com
  // How to create a NodeJS HTTPs server:
  //  contextneutral.com/story/creating-an-https-server-with-nodejs-and-express

  // Get server key and certificate by fs
  // readFileSync is much common use than readFile because its faster and safer
  //const key = fs.readFileSync('encryption/server.key')
  //const cert = fs.readFileSync('encryption/server.crt')

  // Set option with passphrase to decrypt my certificate
  /*const options = {
    key: key,
    cert: cert,
    passphrase: 'MyHomepage'
  }*/

  // Set port and create HTTP and HTTPs Server
  // const port = 443
  const port = process.env.PORT || 3000;
  // const server = https.createServer(options, app).listen(port)
  const httpServer = http.createServer(app).listen(port)
  // var io = socketio(server)
  var ioHTTP = socketio(httpServer)
  console.log(colors.routine(' Created server on port ' + port))

  // Connecting to HTTP Server, the client will redirected to the HTTPs server
  // app.all makes sure, that even on routes-uses the function runs
  app.all(function(req, res, next) {
    if (req.secure) {
      next()
    } else {
      res.redirect('https://' + req.headers.host + req.url)
    }
  })

  // Declare a public folder for client-side scripts and css
  app.use(express.static(path.join(__dirname, 'public')))

  // Use the view engine EJS
  app.set('view engine', 'ejs')

  // Express Session for cookies
  // After 3 h. the session will end if the user is AFK
  app.use(session({
    saveUninitialized: false,
    secret: 'MyHomepage',
    signed: true,
    rolling: true,
    resave: true,
    cookie: {maxAge: 24*60*60*1000}
  }))
  
  // Express Validator
  app.use(expressValidator({
    errorFormatter: function(param, msg, value) {
        var namespace = param.split('.')
        , root    = namespace.shift()
        , formParam = root

      while(namespace.length) {
        formParam += '[' + namespace.shift() + ']';
      }
      return {
        param : formParam,
        msg   : msg,
        value : value
      }
    }
  }))

  // Initialze Passport
  app.use(passport.initialize())
  app.use(passport.session())

  // Initialize BodyParser
  app.use(bodyParser.json({limit: '20mb'}))
  app.use(bodyParser.urlencoded({limit: '20mb', extended: false}))

  // Pass some variables at every handle
  app.use(function(req, res, next) {
    res.locals.isAuthenticated = req.isAuthenticated()
    if (req.isAuthenticated()) {
      res.locals.userid = req.session.passport.user
    }
    res.locals.url = url
    res.locals.protohost = req.protocol + '://' + req.get('host') + "/"
    res.locals.originalUrl = req.originalUrl
    
    req.langUp = req.originalUrl.split('/')[1].toUpperCase()
    req.langLow = req.originalUrl.split('/')[1].toLowerCase()
    next()
  })

  // Setup server variables
  async.waterfall([
    function (cb) {
      ServerData.findOne({name: "myHomepage"}, function(err, data) {
        if (!data||err) {
          myServer = new ServerData({
            name: "myHomepage",
            visitors: 0,
            setupData: new Date()
          })
          myServer.save(function(err) {if (err) {cb(err)}else{cb(null)}})
          console.log(colors.info("Sucessfully saved server data"))
        }else{
          cb(null)
        }
      })
    }
  ], function(err) {
    if (err) console.log(err)
    // Connect web sockets
    const ioSockets = require('./functions/sockets')
    // io.on("connection", ioSockets)
    ioHTTP.on("connection", ioSockets)
  })
  
  // Import/require and use all necessary routes (multy-language support)
  const lang_router = require('./routes/lang')
  const blog_router = require('./routes/blog')
  const blog_lang_router = require('./routes/blog_lang')
  const shit_router = require('./routes/myshit')
  app.use('/en', lang_router)
  app.use('/de', lang_router)
  app.use('/blog', blog_router)
  app.use('/en/blog', blog_lang_router)
  app.use('/de/blog', blog_lang_router)
  app.use('/dash', shit_router)

  // use Sitemap and robots.txt
  app.use('/', require('./routes/googlehandle'))

  // Manage downloads
  app.get('/downloads/:filename', function(req, res){
    var filename = req.params.filename
    var filedir = 'public/downloads/zips/' + filename
    if (fs.existsSync(filedir)) {
      res.download(filedir) // Set disposition and send it.
    }else{
      return res.render('Error.ejs')
    }
  })
  
  // If a User goes to the side, he will be redirected to the language select.
  app.get('/lang', function(req, res) {
    var originalPath=req.query.path

    if (!originalPath) {
      originalPath='/'
    }

    return res.render('LanguageSprache.ejs', {
      path: originalPath
    })
  })
  app.get('/', function(req, res) {
    return res.redirect('/de')
  })
  
  // If a User requests a side, which is not defined by the server, he will be
  // redirected to an error side.
  app.get('*', function(req, res) {
    return res.render('Error.ejs')
  })
  
  console.log(colors.routine(' App sucessfully started. '))

}


// Database connection
// To Start MongoDB from Database (the newest version use Docker!)
db_connection.connect(function(err) {
  init(err)
})