// Load libraries
const express = require('express');
const app = express();
const path = require('path');
const exphbs = require('express-handlebars');

// Init middleware
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
const PORT = process.env.PORT || 5000;

// Include the public folder as static
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index');
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));