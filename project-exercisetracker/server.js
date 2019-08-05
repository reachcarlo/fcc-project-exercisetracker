const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongo = require("mongodb");
const mongoose = require("mongoose");
const shortid = require("shortid");
const cors = require("cors");

mongoose.connect(
  "mongodb+srv://carlo:NzEkYYnMjBuc@cluster0-rd2vn.mongodb.net/test?retryWrites=true&w=majority",
  { useNewUrlParser: true }
);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

var Schema = mongoose.Schema;

var userSchema = new Schema({
  username: String,
  _id: {
    type: String,
    default: shortid.generate
  },
  exercise: Array
});

var User = mongoose.model("User", userSchema);

const dateConverter = date => {
  let iso = new Date(date);
  let day = iso.getDate();
  let year = iso.getFullYear();
  let month = iso.getMonth() + 1;
  return month + "/" + day + "/" + year;
};

app.post("/api/exercise/new-user", function(req, res) {
  let username = req.body.username;
  User.findOne({ username: username }, (err, data) => {
    if (err) res.send("Failed");
    if (data) {
      res.json({
        message: "existing user",
        user: data.username,
        _id: data._id
      });
    } else {
      let newUser = new User();
      newUser.username = username;
      newUser.save((err, user) => {
        if (err) res.send("Failed");
        res.json({
          message: "user created",
          user: user.username,
          _id: user._id
        });
      });
    }
  });
});

app.post("/api/exercise/add", function(req, res) {
  let userId = req.body.userId;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = req.body.date;
  User.findOneAndUpdate(
    { _id: userId },
    {
      $push: {
        exercise: {
          description: description,
          duration: parseInt(duration),
          convertedDate: Date.parse(date),
          date: date
        }
      }
    },
    { new: true },
    (err, data) =>
      res.json({
        username: data.username,
        _id: data.id,
        description: description,
        duration: duration,
        date: dateConverter(date)
      })
  );
});

app.get("/api/exercise/log", function(req, res) {
  let userId = req.query.userId;
  let from = req.query.from != undefined ? Date.parse(req.query.from) : 0;
  let to =
    req.query.to != undefined
      ? Date.parse(req.query.to)
      : 10000000000000000000000000;
  let limit = req.query.limit != undefined ? parseInt(req.query.limit) : 1000;
  User.find(
    {
      _id: userId,
      exercise: { $elemMatch: { convertedDate: { $gt: from, $lt: to } } }
    },
    { exercise: { $slice: -limit } },
    (err, data) => {
      if (err) {
        res.send("Failed");
      }
      if (data) {
        // res.send(data)
        data.forEach(doc => {
          doc.exercise = doc.exercise.filter(ex => {
            return ex.convertedDate >= from && ex.convertedDate <= to;
          });
          res.send(doc);
        });
      } else {
        res.send("not found - verify your userId or modify date range");
      }
    }
  );
});

app.get("/api/exercise/users", function(req, res) {
  User.find({}, { _id: 1, username: 1 }, (err, data) => {
    if (err) {
      res.send("Failed");
    }
    if (data) {
      res.send(data);
    } else {
      res.send("no users found");
    }
  });
});

app.get("/checkDB", function(req, res) {
  User.find()
    .then(item => {
      res.send(item);
    })
    .catch(err => {
      res.status(400).send("unable to find");
    });
});

app.get("/clearDB", function(req, res) {
  User.remove((err, data) => {
    if (err) res.send("Failed");
    res.send(data);
  });
});
