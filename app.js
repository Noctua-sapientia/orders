var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var ordersRouter = require('./routes/orders');

var app = express();

require('dotenv').config();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api/v1/orders', ordersRouter);


// Mongo connection
const mongoose = require('mongoose');
const DB_URL = (process.env.DB_URL || 'mongodb://localhost/test');

mongoose.connect(DB_URL);
const db = mongoose.connection;

db.on('error', console.error.bind(console, ' db connection error:'));


// Swagger docuemntation setup
var swaggerJsDoc = require('swagger-jsdoc');
var swaggerUi = require('swagger-ui-express');
var options = {
    definition: {
        openapi: '3.0.0',
        info: {title: 'Orders API', version: '1.0.0'},
        tags: [
            {name: 'Orders', description: 'Operations related to orders'}
        ],
    },
    apis: ['./routes/orders.js'],
};
var swaggerSpec = swaggerJsDoc(options);

// Routes
app.use('/', indexRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/apidocs', 
    swaggerUi.serve, 
    swaggerUi.setup(swaggerSpec));


module.exports = app;
