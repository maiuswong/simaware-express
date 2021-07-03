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

/* Airport Page */
app.get('/airport/:icao', (req, res) => {
    res.render('airport', { icao: req.params.icao });
})

/*  Users Page */
app.get('/user/:cid', (req, res) => {
    res.render('user', { cid: req.params.cid });
})

app.get('/event/:id', (req, res) => {
    res.render('event', {id: req.params.id});
})

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));