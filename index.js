const express = require("express");
const {v4: uuidv4} = require("uuid");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const bcrypt = require("bcrypt");
const { createGunzip } = require("zlib");

const saltRounds = 10;
const path = "./db/data.json";

const getData = () => {
    let data = fs.readFileSync(path);
    return JSON.parse(data);
}

const saveData = (data) => {
    let temp = JSON.stringify(data);
    fs.writeFileSync(path, temp);
}

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname));
app.use(multer({
    dest:"uploads",
    fileFilter: (req, file, cb) => {
        if (file.mimetype == 'image/png' || file.mimetype == 'image/jpg' || file.mimetype == 'image/gif'){
            cb(null, true)
        }
        else{
            cb(null, false)
        }
    }
}).single("filedata"));

app.post("/users/register", (req, res) => {
    let data = getData();
    let id = uuidv4();
    let password = req.body.password;
    if (password.length > 6){
        bcrypt.genSalt(saltRounds, (err, salt) => {
            bcrypt.hash(password, salt, (err, hash) => {
                if (err){
                    console.log(err);
                }
                else{
                    let user = {
                        "id": id,
                        "username": req.body.username,
                        "email": req.body.email,
                        "password": hash,
                        "token": "",
                        "loginDate": ""
                    }
                    data["users"].push(user);
                    saveData(data);
                    res.send("User successfully registered!");
                }
            });
        });
    }
    else{
        res.send("Password is to short");
    }
});

app.post("/users/login", (req, res) => {
    let data = getData();
    let user = data["users"].find(element => {
        if (element.email == req.body.email){
            return element;
        }
    })

    if (user == null){
        res.send("Invalid email");
    }
    else{
        bcrypt.compare(req.body.password, user.password, (err, result) => {
            if (result){
                let token = uuidv4();
                let date = new Date().getTime();
                let index = data["users"].indexOf(user);
                data["users"][index]["token"] = token;
                data["users"][index]["loginDate"] = date;
                saveData(data);
                res.send("Successfully logged in!")
            }
            else{
                res.send("Invalid password");
            }
        });
    }
});

app.post("/users/upload", (req, res) => {
    let date = new Date().getTime();
    let filedata = req.file;
    let data = getData();
    let id = uuidv4();
    console.log(filedata);
    data["users"].find(element => {
        if (req.body.token == element.token){
            if (date - element.loginDate <= 3600000){
                if (filedata){
                    let photo = {
                        "id": id,
                        "title": req.body.title,
                        "path": filedata.path,
                        "userId": element.id
                    }
                    data["photos"].push(photo);
                    saveData(data);
                    res.send("File uploaded!");
            }
            else{
                res.send("The file extention is wrong");
            }
            }
            else{
                let index = data["users"].indexOf(element);
                data["users"][index]["token"] = "";
                saveData(data);
                res.send("Session time out");
            }
        }
    })
});

app.listen(6969, () => {
    console.log("Server Started!");
});