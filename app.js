const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const session = require("express-session");
const passport = require('./config/passport-google');
const cookieParser = require('cookie-parser');
const db = require("./config/database");
const userRouter = require("./routes/userRouter")
const adminRouter = require("./routes/adminRouter")
const authRouter = require('./routes/authRouter');
const nocache = require('nocache');

db();

app.use(nocache());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.use(session({
    secret: process.env.SESSION_SECRET ,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV ,
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine" , "ejs");
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')]);

app.use(express.static(path.join(__dirname,'public')));

app.use("/",userRouter);
app.use("/admin",adminRouter);
app.use('/auth', authRouter);

app.listen(process.env.PORT,()=>{

});

module.exports = app;