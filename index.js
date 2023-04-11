const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");
const port = process.env.PORT || 3000;
const user = require("./Routes/userRoutes.js");
const server = http.createServer(app);
const jwt = require("jsonwebtoken");
const connection = require("./config/dbConfig.js");
const socket = require("socket.io");

const corsOptions = {
    origin: "*",
    methods: ["GET", "POST"],
};

app.use(express.json(), cors(corsOptions));
app.use("/user", user);

app.get("/", (req, res) => {
    res.json({ message: "Welcome to the API" }).status(200);
});

server.listen(port, () => {
    console.log(`Server started on port ${port}`);
});

const io = socket(server, {
    cors: {
        origin: "*",
        credentials: true,
    },
});

global.onlineUsers = new Map();

const add_user = (userId, socketId) => {
    onlineUsers.set(socketId, userId);
    console.log(onlineUsers);
};

const get_server_list = async (userId) => {
    const query = `SELECT * FROM servers 
    JOIN server_members ON servers.id = server_members.server_id 
    WHERE server_members.user_id = ?`;
    const params = [userId];
    connection.query(query, params, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            // serverList = id name 
            const serverList = result.map((server) => { return { id: server.id, name: server.name } });
            chatSocket.emit("server-list", serverList);
        }
    });
};

const create_server = async (params) => {
    const query = 'INSERT INTO servers (name, owner_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())';
    const param = [params.serverName, params.userId];
    connection.query(query, param, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            const serverId = result.insertId;
            const query = 'INSERT INTO server_members (server_id, user_id, joined_at) VALUES (?, ?, NOW())';
            const params = [serverId, param[1]];
            connection.query(query, params, (err, result) => {
                if (err) {
                    console.log(err);
                } else {
                    const server = { id: serverId, name: param[0] };
                    io.emit("server-created", server);
                }
            });
        }
    });
};


const disconnect_user = (socketId) => {
    onlineUsers.delete(socketId);
};


io.on("connection", (socket) => {

    global.chatSocket = socket;

    socket.on("add-user", (userId) => {add_user(userId, socket.id)});
    socket.on("get-server-list", (userId) => {get_server_list(userId)});
    socket.on("create-server", (params) => {create_server(params)});
    socket.on("disconnect", () => {disconnect_user(socket.id)});
});
