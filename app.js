// Load libraries
const express = require('express');
const app = express();
const path = require('path');
const exphbs = require('express-handlebars');
const { Sequelize, Model, DataTypes } = require('sequelize');

// Init middleware
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
const PORT = process.env.PORT || 5000;

// Include the public folder as static
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
    res.render('event', {id: req.params.id});
})

/* Events Analysis Page */
app.get('/analysis/:id', (req, res) => {
    res.render('analysis', {id: req.params.id});
})

/* Patrons Page */
app.get('/patreon', (req, res) => {
    res.render('patreon', {id: req.params.id});
})

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));