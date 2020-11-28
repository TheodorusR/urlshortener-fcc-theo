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
  url : String,
  numId : Number
});

const Website = mongoose.model('Website', websiteSchema);

const createShortUrl = (someUrl, done) => {
  let domain = someUrl.replace(protocolRegex, "");
  dns.lookup(domain, (err, address, family) => {
    if (err) return done(err);
    idGen++;
    Website.create({url: someUrl, numId: idGen}, (err, data) => {
      if (err) return done(err);
      console.log("object created!");
      done(null, data);
    });
  });
};


const findUrlById = (someId, done) => {
  Website.findOne({numId: someId}, (err, data) => {
    if (err) return done(err);
    done(null, data);
  });
};

const checkUrl = (someUrl, done) => {
  Website.findOne({url: someUrl}, (err, data)=> {
    if (err) return done(err);
    done(null, data);
  });
};

const getMaxId = (done) => {
  Website.findOne().sort({numId:-1}).exec((err, data) => {
    if (err) return done(err);
    done(null, data);
  });
};

getMaxId((err, data) => {
  if (err) {
    handleError(err);
  } else if (data) {
    idGen = data.numId;
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
        handleError(err);
      } else if (data) {
        //if the short url already exist
        res.json({"original_url": data.url, "short_url": data.numId});
      } else {
        //if the short url hasn been made
        createShortUrl(req.body.url, (err, data) => {
          if (err) {
            handleError(err);
          } else {
            res.json({"original_url": data.url, "short_url": data.numId});
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
      console.log(data.url);
      console.log(typeof data.url);
      res.redirect(data.url);
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
