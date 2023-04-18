const connection = require("../config/dbConfig");
const { md5 } = require("../config/cryptConfig");
const utilsToken = require("../config/utilsToken");
const utilsMailer = require("../config/utilsMailer");
const { randomBytes } = require("crypto");

const userLogin = async (req, res) => {
    const { email, password } = req.body;
    const query = `SELECT * FROM user_information WHERE email = ? AND password = ?`;
    const params = [email, md5(password)];
    try {
        const results = await new Promise((resolve, reject) => {
            connection.query(query, params, (error, results, fields) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
        if (results.length > 0) {
            const token = await utilsToken.createToken(results[0].id);
            console.log(token);
            return res.status(200).json({
                message: "Login successful",
                token: token,
                uid: results[0].id,
                username: results[0].username,
            });
        } else {
            return res
                .status(401)
                .json({ message: "Invalid username or password" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const userRegister = async (req, res) => {
    const { username, password, email } = req.body;

    try {
        // Vérifier si l'email est déjà utilisé
        const emailQuery = `SELECT * FROM user_information WHERE email = ?`;
        const emailResults = await new Promise((resolve, reject) => {
            connection.query(emailQuery, [email], (error, results, fields) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

        if (emailResults.length > 0) {
            return res.status(400).json({ message: "E-mail already in use" });
        }

        // Insérer les données de l'utilisateur
        const insertQuery = `INSERT INTO user_information (username, password, email,created_at) VALUES (?, ?, ?,?)`;
        const insertParams = [username, md5(password), email, new Date()];

        const insertResults = await new Promise((resolve, reject) => {
            connection.query(
                insertQuery,
                insertParams,
                (error, results, fields) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });

        // Générer un token JWT avec l'id de l'utilisateur
        const token = await utilsToken.createToken(insertResults.insertId);

        return res.status(200).json({
            message: "Registration successful",
            token,
            uid: insertResults.insertId,
            username: username,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const userVerify = async (req, res) => {
    const { token, uid } = req.body;
    const id = await utilsToken.verifyToken(uid, token);
    if (id) {
        return res.status(200).json({
            message: "Token valid",
            id: id.token.userId,
            username: id.username,
        });
    } else {
        return res.status(401).json({ message: "Invalid token" });
    }
};

const changePassword = async (req, res) => {
    const { uid, oldPassword, newPassword } = req.body;
    try {
        const results = await new Promise((resolve, reject) => {
            query = `SELECT * FROM user_information WHERE id = ?`;
            connection.query(query, [uid], (error, results, fields) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
        if (results.length > 0) {
            const user = results[0];
            const oldHashedPassword = user.password;
            if (oldHashedPassword !== md5(oldPassword)) {
                return res.status(401).json({ message: "Invalid password" });
            }
            const newHashedPassword = md5(newPassword);
            await new Promise((resolve, reject) => {
                query = `UPDATE user_information SET password = ? WHERE id = ?`;
                connection.query(
                    query,
                    [newHashedPassword, uid],
                    (error, results, fields) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    }
                );
            });
            const newToken = await utilsToken.changeToken(uid);
            await new Promise((resolve, reject) => {
                query = `UPDATE user_information SET token_id = ? WHERE id = ?`;
                connection.query(
                    query,
                    [newToken.id, uid],
                    (error, results, fields) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    }
                );
            });
            return res
                .status(200)
                .json({
                    message: "Password changed successfully",
                    token: newToken.token,
                });
        } else {
            return res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const resetPasswordSend = async (req, res) => {
    const { email } = req.body;
    try {
        const results = await new Promise((resolve, reject) => {
            query = `SELECT * FROM user_information WHERE email = ?`;
            connection.query(query, [email], (error, results, fields) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
        if (results.length > 0) {
            const user = results[0];
            const token = randomBytes(20).toString("hex");
            await new Promise((resolve, reject) => {
                query = `Insert into password_reset (reset_password_token, user_information_id, token_created_at) values (?,?,?)`;
                connection.query(
                    query,
                    [token, user.id, new Date()],
                    (error, results, fields) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(results);
                        }
                    }
                );
            });
            utilsMailer.sendPasswordResetEmail(email, token);
            return res.status(200).json({ message: "Email sent" });
        } else {
            return res.status(200).json({ message: "Email sent" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const resetPassword = async (req, res) => {
    const { token, password,password2 } = req.body;
    if (password !== password2) {
        return res.status(400).json({ message: "Passwords do not match" });
    }
    const newPassword = md5(password);
    try {
        const results = await new Promise((resolve, reject) => {
            query = `SELECT * FROM password_reset WHERE reset_password_token = ?`;
            connection.query(query, [token], (error, results, fields) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
        if (results.length > 0) {
            const user = results[0];
            console.log(user)
            if (user.reset_password_token !== token) {
                return res.status(401).json({ message: "Invalid token" });
            }else {
                await new Promise((resolve, reject) => {
                    query = `UPDATE user_information SET password = ? WHERE id = ?`;
                    connection.query(
                        query,
                        [newPassword, user.user_information_id],
                        (error, results, fields) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(results);
                            }
                        }
                    );
                });
                console.log(user.id)
                await new Promise((resolve, reject) => {
                    query = `DELETE FROM password_reset WHERE user_information_id = ?`;
                    connection.query(
                        query,
                        [user.user_information_id],
                        (error, results, fields) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(results);
                            }
                        }
                    );
                });
                return res.status(200).json({ message: "Password changed" });
            }
        } else {
            return res.status(404).json({ message: "Please make sure the token is valid" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};




module.exports = {
    userLogin,
    userRegister,
    userVerify,
    changePassword,
    resetPasswordSend,
    resetPassword,
};
