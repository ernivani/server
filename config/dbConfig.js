const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    database: 'userdb',
    user: 'root',
    password: 'ernicani'
});

connection.connect((err) => {
    if (err) {
        console.log(err);
    } else {
        console.log('Connected to MySQL');
    }
}
);

module.exports = connection;
