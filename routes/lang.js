// Import/require all necessary node-modules
var express = require('express')
var router = express.Router()
var fs = require('fs')

// Import/require all necessary files
const url = require('../functions/url_paths.js')
const schema = require('../functions/schema.js')
const ServerData = schema.ServerData

// Start with the GETs. If somebody requests a url, he gets back a view-file.
router.get(url.main.route, function(req, res) {
  ServerData.findOne({name: "myHomepage"}).exec(function(err, data) {
    if (err) console.log(err)
    res.render(req.langUp+'/Start', {
      server: data
    })
  })
})

router.get(url.main.aboutme, function(req, res) {
  res.render(req.langUp+'/AboutMe')
})

router.get(url.main.references, function(req, res) {
  res.render(req.langUp+'/References')
})

router.get(url.main.work, function(req, res) {
  
  // The 'work' sections should read a folder with all the works in it.
  // Declarates vars for hand over to ejs.
  var files = [];
  var pics = [];
  
  // Get some data about work
  var descriptions = require('../functions/descriptions.json')
  
  // Read the folders with work in it (.zip, .jpg/.png/.bmp, .pdf)
  var zips = fs.readdirSync('./public/downloads/zips')
  var pictures = fs.readdirSync('./public/downloads/pictures')
  var pdfs = fs.readdirSync('./public/downloads/pdf')
  
  // Creates Arrays/Lists with Information about the files and pictures.
  // For that it will use the descriptions data from above.
  zips.forEach(function (zip) {
    zip = zip.replace(".zip", "")
    // Check if file has data in descriptions-file. If not, it will return an
    // error display on the side. Same at pictures
    if (descriptions.files[zip]) {
      files.push({name:zip, short:descriptions.files[zip]["short_"+req.langLow],
                  long:descriptions.files[zip].long,
                  pic:descriptions.files[zip].pic,
                  prio:descriptions.files[zip].prio})
    }else{
      if (req.langUp=="EN") {
        files.push({name:"Unkown file ("+zip+")",
                    short:"Unkown file. If you see this, please contact me. " +
                          "Do NOT download this! Thank you.",
                    long:"unkown.html", pic:"../../pics/error.png", prio:0})
      }else if (req.langUp=="DE") {
        files.push({name:"Unbekannte Datei ("+zip+")",
                  short:"Unbekannte Datei. Wenn du das siehst, gib mir bitte bescheid. " +
                        "Auf keinen Fall herunter laden! Danke.",
                  long:"unkown.html", pic:"../../pics/error.png", prio:0})
      }else{
        return res.render('Error.ejs')
      }
    }
  })
  pictures.forEach(function (picture) {
    var pic = picture;
    picture = picture.replace(".jpg", "")
    picture = picture.replace(".png", "")
    picture = picture.replace(".bmp", "")
    if (descriptions.pictures[picture]) {
      pics.push({name:picture, short:descriptions.pictures[picture]["short_"+req.langLow],
                 pic:pic, prio:descriptions.pictures[picture].prio})
    }else{
      if (req.langUp=="EN") {
        pics.push({name:"Unkown picture ("+picture+")",
                  short:"Unkown picture. If you see this, please contact me. " +
                        "Do NOT download this! Thank you.",
                  pic:"../../pics/error.png", prio:0})
      }else if (req.langUp=="DE") {
        pics.push({name:"Unbekanntes Bild ("+picture+")",
                  short:"Unbekanntes Bild. Wenn du das siehst, gib mir bitte bescheid. " +
                        "Auf keinen Fall herunter laden! Danke.",
                  pic:"../../pics/error.png", prio:0})
      }else{
        return res.render('Error.ejs')
      }
    }
  })
  
  // Sort files by priority.
  function compare(a,b) {
    if (a.prio < b.prio)
      return 1;
    if (a.prio > b.prio)
      return -1;
    return 0;
  }
  files.sort(compare);
  pics.sort(compare);
  
  // Give EJS some variables. (The files etc.)
  res.render(req.langUp+'/Work', {
    files: files,
    pics: pics,
    pdfs: pdfs
  })
  
  
})

// To have more information about some works, extra sides with plain text
// should be accessable to user.
router.get(url.main.works+'/:file', function(req, res) {
  var filename = req.params.file
  // Capitalze the first letter of file string. (For dir-structure reasons)
  String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1)
  }
  filename = filename.capitalize()
  // Check if requested file exists, else => Error Page
  var dir = req.langUp+'/Works/'+filename
  if (fs.existsSync('views/'+dir+'.ejs')) {
    return res.render(dir)
  }else{
    return res.render('Error.ejs')
  }
})

module.exports = router
