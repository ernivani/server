const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    database: 'userdb',
    user: 'root',
    password: 'ernicani',
    multipleStatements: true
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

// user_information : contient les informations sur les utilisateurs.
// servers : contient les informations sur les serveurs.
// server_members : gère les relations entre les utilisateurs et les serveurs, y compris les rôles des membres.
// roles : contient les rôles et leurs associations aux serveurs.
// permissions : contient les permissions possibles pour les rôles.
// role_permissions : gère les relations entre les rôles et les permissions.
// channels : contient les informations sur les channels associés aux serveurs.
// messages : contient les messages envoyés entre les utilisateurs.