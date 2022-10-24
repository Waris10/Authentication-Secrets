//jshint esversion: 6
/* eslint-env es6 */
/* eslint-disable no-console */

require('dotenv').config();
const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const md5 = require('md5');

const app = express();


app.set('view engine', 'ejs');
app.use(express.urlencoded({
  extended: true
}));
app.use(express.static('public'));

mongoose.connect('mongodb://localhost:27017/userDB') //running my database app locally before i deployed it

const userSchema = new mongoose.Schema(
  {
    email : String,
    password : String
  });

  const User = mongoose.model('User', userSchema);

  // TODO:

  app.get('/', (req, res) =>{
    res.render('home');
  });

  app.get('/login', (req, res) =>{

    res.render('login');
  });

  app.get('/register', (req, res) =>{
    res.render('register');
  });

  app.post('/register', (req, res) =>{
    const hashedPassword = md5(req.body.password)
    const newUser = new User({
      email : req.body.username,
      password : hashedPassword
    });

    newUser.save((err) =>{
      if (err) {
        console.log(err);
      } else {
        res.render('secrets');
      }
    });
  });

  app.post('/login', (req, res) =>{
    const username = req.body.username;
    const password = md5(req.body.password);

    User.findOne({email : username}, (err, foundUser) =>{
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          if (foundUser.password === password ) {
            res.render('secrets');
          }
        }
      }
    });
  });






  app.listen(3000, () => {
    console.log('Server has started successfully');
  })
