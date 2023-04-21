const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");
const port = process.env.PORT || 3000;
const user = require("./Routes/userRoutes.js");
const server = http.createServer(app);
const jwt = require("jsonwebtoken");
const socket = require("socket.io");
const fs = require("fs");

const corsOptions = {
    origin: "*",
    methods: ["GET", "POST"],
};

app.use(express.json(), cors(corsOptions));
app.use("/user", user);

app.get("/", (req, res) => {
    res.json({ message: "Welcome to the API" }).status(200);
});

const services = [
    { name: "Web", url: "https://impin.fr" },
    { name: "API", url: "https://api.impin.fr" },
];

const https = require("https");
app.get("/status", (req, res) => {
    // Make an HTTPS request to each service and check the status code
    const promises = services.map((service) => {
        return new Promise((resolve) => {
            https
                .get(service.url, (response) => {
                    const status = response.statusCode === 200 ? "OK" : "KO";
                    resolve({ name: service.name, status });
                })
                .on("error", () => {
                    resolve({ name: service.name, status: "KO" });
                });
        });
    });

    // Wait for all promises to resolve and return the results as JSON
    Promise.all(promises).then((results) => {
        res.json({ services: results });
    });
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
