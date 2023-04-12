const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");
const port = process.env.PORT || 3000;
const user = require("./Routes/userRoutes.js");
const server = http.createServer(app);
const jwt = require("jsonwebtoken");
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

global.io = socket(server, {
    cors: {
        origin: "*",
        credentials: true,
    },
});

global.onlineUsers = new Map();

const {
    add_user,
    get_server_list, 
    create_server, 
    disconnect_user,
    get_channel_by_server,
} = require("./socket/request.js");

io.on("connection", (socket) => {
    global.chatSocket = socket;

    socket.on("add-user", (userId) => {
        add_user(userId, socket.id);
    });
    socket.on("get-server-list", (userId) => {
        get_server_list(userId);
    });
    socket.on("create-server", (params) => {
        create_server(params);
    });

    socket.on("get-channel-by-server", (paramss) => {
        get_channel_by_server(paramss);
    });

    socket.on("disconnect", () => {
        disconnect_user(socket.id);
    });
});
