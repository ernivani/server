const jwt = require("jsonwebtoken");
const connection = require("../config/dbConfig");

const SELECT_TOKEN_ID =
    "SELECT token_id,username FROM user_information WHERE id = ?";
const UPDATE_TOKEN_ID = "UPDATE user_information SET token_id = ? WHERE id = ?";

const createToken = async (
    userId,
    secret = "ernitropbg",
    expiresIn = "30d"
) => {
    try {
        const results = await new Promise((resolve, reject) => {
            connection.query(
                SELECT_TOKEN_ID,
                [userId],
                (error, results, fields) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        if (results.length > 0 && results[0].token_id !== null) {
            const tokenId = results[0].token_id;
            const token = jwt.sign({ userId, tokenId }, secret, { expiresIn });
            return token;
        } else {
            console.log("Creating token");
            const token = await changeToken(userId, secret, expiresIn);
            return token;
        }
    } catch (error) {
        console.error(error);
        return false;
    }
};

const verifyToken = async (userId, token, secret = "ernitropbg") => {
    try {
        const results = await new Promise((resolve, reject) => {
            connection.query(
                SELECT_TOKEN_ID,
                [userId],
                (error, results, fields) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        if (results.length === 0 || results[0].token_id === null) {
            console.log("Token invalid");
            return false;
        } else {
            const decoded = jwt.verify(token, secret);
            const tokenId = decoded.tokenId;
            if (tokenId === results[0].token_id) {
                return {
                    token: decoded,
                    username: results[0].username,
                };
            } else {
                console.log("Token invalid");
                return false;
            }
        }
    } catch (error) {
        console.error(error);
        return false;
    }
};

const killToken = async (userId, token, secret = "ernitropbg") => {
    try {
        const decoded = jwt.verify(token, secret);
        const tokenId = decoded.tokenId;
        const query =
            "UPDATE user_information SET token_id = ? WHERE id = ? AND token_id = ?";
        const params = [null, userId, tokenId];
        await new Promise((resolve, reject) => {
            connection.query(query, params, (error, results, fields) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    } catch (error) {
        console.error(error);
        return false;
    }
};

const changeToken = async (
    userId,
    secret = "ernitropbg",
    expiresIn = "30d"
) => {
    try {
        const tokenId =
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
        const token = jwt.sign({ userId, tokenId }, secret, { expiresIn });
        const updateQuery =
            "UPDATE user_information SET token_id = ? WHERE id = ?";
        const updateParams = [tokenId, userId];
        await new Promise((resolve, reject) => {
            connection.query(
                updateQuery,
                updateParams,
                (error, results, fields) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        });
        return token;
    } catch (error) {
        console.log(error);
        return false;
    }
};

killToken(
    "21",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIxLCJ0b2tlbklkIjoiMnpva2czNmN3amJ4NWh3NWNqNXVyIiwiaWF0IjoxNjgwNzE2NzU1LCJleHAiOjE2ODMzMDg3NTV9.W_9PIhKZapDMy8tvCBruMkWp0LQmt6_55zM5G-461zE"
);

module.exports = {
    createToken,
    verifyToken,
    killToken,
    changeToken,
};
