//jshint esversion: 6
/* eslint-env es6 */
/* eslint-disable no-console */

require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.set('view engine', 'ejs');
app.use(express.urlencoded({
  extended: true
}));
app.use(express.static('public'));

app.use(
  session({
    secret : 'Our little secret.',
    resave : false,
    saveUninitialized : false
  })
);


app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://127.0.0.1:27017/userDB'); //running my database app locally before i deployed it
// mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema(
  {
    email : String,
    password : String,
    googleId : String,
    facebookId: String,
    secret: String
  });

  userSchema.plugin(passportLocalMongoose);
  userSchema.plugin(findOrCreate);

  const User = mongoose.model('User', userSchema);

  passport.use(User.createStrategy());

  // use static serialize and deserialize of model for passport session support;

  passport.serializeUser((user, cb) =>{
    process.nextTick(() =>{
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });

  passport.deserializeUser((user, cb) =>{
    process.nextTick(() =>{
      return cb(null, user);
    });
  });

  // /************ ANGELA'S METHOD *************/
  // passport.serializeUser((user, done) =>{
  //   done(null, user.id)
  // });
  //
  // passport.deserializeUser((id, done) =>{
  //   User.findById(id, (err, user) =>{
  //       done(err, user);
  //   })
  // });

  //My google strategy

  passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/secrets',
    // This option tells the strategy to use the userinfo endpoint instead
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  }, (accessToken, refreshToken, profile, cb) =>{
    // console.log( profile );
    User.findOrCreate({ googleId: profile.id }, (err, user) =>{
      return cb(err, user);
    });
  }
));


//My facbook strategy
passport.use(new FacebookStrategy({
  clientID: process.env.APP_ID,
  clientSecret: process.env.SECRET_KEY,
  callbackURL: "http://localhost:3000/auth/facebook/secrets",
  enableProof: true
}, (accessToken, refreshToken, profile, cb) =>{
  // console.log( profile );
  User.findOrCreate({ facebookId: profile.id }, (err, user) =>{
    return cb(err, user);
  });
}
));

// TODO:

app.get('/', (req, res) =>{
  res.render('home');
});

app.get('/auth/facebook',
passport.authenticate('facebook', {  authType: 'reauthenticate', scope: ['email']}));

app.get('/auth/facebook/secrets',
passport.authenticate('facebook', { failureRedirect: '/login' }),
(req, res) =>{
  // Successful authentication, redirect home.
  res.redirect('/secrets');
});

app.get('/auth/google',
passport.authenticate('google', { authType: 'reauthenticate', scope: ['profile'] })
);

app.get('/auth/google/secrets',
passport.authenticate('google', { failureRedirect: '/login' }), (req, res) =>{
  // Successful authentication, redirect secrets page.
  res.redirect('/secrets');
});

app.get('/login', (req, res) =>{
  res.render('login');
});

app.get('/register', (req, res) =>{
  res.render('register');
});

app.get('/secrets', (req, res) =>{
  User.find({'secret':{ $ne: null}}, (err, foundUsers) =>{
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render('secrets', {
           usersWithSecrets: foundUsers
         });
      }
    }
  });
});


app.get('/submit', (req, res) =>{
  if (req.isAuthenticated()) {
    res.render('submit');
  } else {
    res.redirect('/login');
  }
});

app.post('/submit', (req, res) =>{
  const submittedSecret = req.body.secret;
  console.log(req.user.id);
  User.findById( req.user.id, (err, foundUser) =>{
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(() =>{
          res.redirect('/secrets');
        });
      }
    }
  });
});

app.get('/logout',( req, res ) =>{
  req.logout((err) =>{
    if (err) {
      console.log(err);
    } else {
      res.redirect('/');
    }
  });
});

app.post('/register', (req, res) =>{
  User.register({ username : req.body.username }, req.body.password, (err, user) =>{
    if (err) {
      console.log(err);
      res.redirect('/register');
    } else {
      passport.authenticate('local')(req, res, () =>{
        res.redirect('/secrets')
      });
    }
  });
});

app.post('/login', (req, res) =>{
  const user = new User({
    username : req.body.username,
    password : req.body.password
  });

  // USING PASSPORT TO LOGIN AUTOMATICALLY
  req.login(user, (err) =>{
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req, res, () =>{
        res.redirect('/secrets');
      });
    }
  });
});






app.listen(3000, () => {
  console.log('Server has started successfully');
});
