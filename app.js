// Load libraries
const express = require('express');
const app = express();
const path = require('path');
const exphbs = require('express-handlebars');
const { Sequelize, Model, DataTypes } = require('sequelize');
const minify = require('express-minify');

// Init middleware
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
const PORT = process.env.PORT || 5000;

// Include the public folder as static
// app.use(minify());
app.use(express.static(path.join(__dirname, 'public')));

/* Index Page */
app.get('/', (req, res) => {
    res.render('index');
});

/* Index Page */
app.get('/stats/', (req, res) => {
    res.render('stats');
});

/* Airport Page */
app.get('/airport/:icao', (req, res) => {
    res.render('airport', { icao: req.params.icao });
})

/*  Users Page */
app.get('/user/:cid', (req, res) => {
    res.render('user', { cid: req.params.cid });
})

/* Events Page */
app.get('/events/', (req, res) => {
    res.render('events');
})

/* Events View Page */
app.get('/event/:id', (req, res) => {
    if(req.params.id < 1000)
    {
        res.render('legacyevent', {id: req.params.id});
    }
    else
    {
        res.render('event', {id: req.params.id})
    }
})

/* Events Analysis Page */
app.get('/analysis/:id', (req, res) => {
    res.render('analysis', {id: req.params.id});
})

app.get('/selfservice/events/request', (req, res) => {
    res.redirect('https://api.simaware.ca/selfservice/events/request');
})

/* 404 Page */
app.use(function(req, res, next) {
    res.status(404);
    res.render('404', {layout: false});
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));