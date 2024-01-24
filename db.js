// Mongo connection
const mongoose = require('mongoose');

let DB_URL;

if (process.env.NODE_ENV === 'test') {
    // Utiliza la base de datos de test
    DB_URL = 'mongodb://localhost/test';
} else {
    // Utiliza la base de datos de producción
    DB_URL = process.env.DB_URL || 'mongodb+srv://orders:orders@orders.y95zrbf.mongodb.net/?retryWrites=true&w=majority';
}

console.log('Connecting to database at: %s', DB_URL);

mongoose.connect(DB_URL);
const db = mongoose.connection;

db.on('error', console.error.bind(console, ' db connection error:'));

module.exports = db;
