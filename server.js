require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dns = require('dns');
const protocolRegex = /^https?:\/\//;
var idGen;

mongoose.connect(process.env.DB_URI, {useNewUrlParser: true, useUnifiedTopology: true});
const websiteSchema = new mongoose.Schema({
  original_url : String,
  short_url : Number
});

const Website = mongoose.model('Website', websiteSchema);

const createShortUrl = (someUrl, done) => {
  let domain = someUrl.replace(protocolRegex, "");
  dns.lookup(domain, (err, address, family) => {
    if (err) return done(err);
    idGen++;
    Website.create({original_url: someUrl, short_url: idGen}, (err, data) => {
      if (err) return done(err);
      console.log("object created!");
      done(null, data);
    });
  });
};


const findUrlById = (someId, done) => {
  Website.findOne({short_url: someId}, (err, data) => {
    if (err) return done(err);
    done(null, data);
  });
};

const checkUrl = (someUrl, done) => {
  Website.findOne({original_url: someUrl}, (err, data)=> {
    if (err) return done(err);
    done(null, data);
  });
};

const getMaxId = (done) => {
  Website.findOne().sort({short_url:-1}).exec((err, data) => {
    if (err) return done(err);
    done(null, data);
  });
};

getMaxId((err, data) => {
  if (err) {
    console.log(err);
  } else if (data) {
    idGen = data.short_url;
  } else {
    idGen = 0;
  }
});

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.use(bodyParser.urlencoded({extended: false}));

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl/new', function(req,res) {
  if (protocolRegex.test(req.body.url)) {
    checkUrl(req.body.url, (err,data) => {
      if (err) {
        console.log(err);
      } else if (data) {
        //if the short url already exist
        res.json({"original_url": data.original_url, "short_url": data.short_url});
      } else {
        //if the short url hasn been made
        createShortUrl(req.body.url, (err, data) => {
          if (err) {
            console.log(err);
          } else {
            res.json({"original_url": data.original_url, "short_url": data.short_url});
          };
        });
      }
    });
  } else {
    res.json({error: 'invalid url'});
  }
});

app.get("/api/shorturl/:num", function(req,res) {
  findUrlById(req.params.num, (err,data) => {
    if (err) {
      res.json({"error":"No short URL found for the given input"});
    } else {
      res.redirect(data.original_url);
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
