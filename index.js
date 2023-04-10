const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");
const port = process.env.PORT || 3000;
const user = require("./Routes/userRoutes.js");

const server = http.createServer(app);

const corsOptions = {
    origin: "https://impin.fr",
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
const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

const jwt = require("jsonwebtoken");

io.on("connection", (socket) => {
    console.log("A user connected");

    // Décode le token JWT et attribue l'ID de l'utilisateur au socket
    try {
        const token = socket.handshake.query.token;
        const decoded = jwt.verify(token, "ernitropbg");
        socket.id = decoded.userId.toString();
        console.log("New socket id:", socket.id);
    } catch (err) {
        console.log("Error:", err);
    }

    // Gestionnaire d'événements pour les demandes d'ami
    socket.on("friend_request", (data) => {
        console.log(`Friend request from ${socket.id} to ${data.receiverId}`);

        // Parcourt la liste des sockets connectés pour trouver le destinataire
        io.sockets.sockets.forEach((connectedSocket) => {
            console.log(connectedSocket.id);

            // Si le socket correspond au destinataire, émet l'événement 'friend_request'
            if (connectedSocket.id === data.receiverId) {
                try {
                    connectedSocket.emit("friend_request", data);
                } catch (error) {
                    console.log("Error while emitting friend_request:", error);
                }
            }
        });
    });

    // Gestionnaire d'événements pour les déconnexions
    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});
