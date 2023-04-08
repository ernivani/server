const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
const port = process.env.PORT || 3000;
const user = require("./Routes/userRoutes.js");

const server = http.createServer(app);
const io = socketIO(server);

const corsOptions = {
    origin: "*",
    optionsSuccessStatus: 200,
};

// 


app.use(express.json(), cors(corsOptions));


app.use("/user", user);

app.get("/", (req, res) => {
    res.json({ message: "Welcome to the API" }).status(200);
});



server.listen(port, () => {
    console.log(`Server started on port ${port}`);
});



// io.on("connection", (socket) => {
//     console.log("A user connected with id:", socket.id);

//     socket.on("changeSocketId", (newSocketId) => {
//         console.log(
//             `Changing socket ID for user ${socket.id} to ${newSocketId}`
//         );
//         socket.id = newSocketId;
//         console.log("New socket id:", socket.id);
//         socket.emit("socketIdChanged", newSocketId);
//     });

//     socket.on("sendMessage", ({ id, message, recipientId }) => {
//         console.log(
//             `Received message from user ${id} to ${recipientId}: ${message}`
//         );
//         io.sockets.sockets.forEach((socket) => {
//             if (socket.id === recipientId) {
//                 socket.emit("message", { id: id, message: message });
//             }
//         });
//     });

//     socket.on("disconnect", () => {
//         console.log("A user disconnected");
//     });
// });