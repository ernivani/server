const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");
const port = process.env.PORT || 3000;
const user = require("./Routes/userRoutes.js");
const server = http.createServer(app);
const jwt = require("jsonwebtoken");
const socket = require("socket.io");
const {
	add_user,
	get_server_list,
	create_server,
	disconnect_user,
	GetChannels,
	getAllServer,
	getAllUser,
	GetMessages,
	SendMessages,
} = require("./socket/request.js");

const corsOptions = {
	origin: "*",
	methods: ["GET", "POST"],
};

app.use(express.json(), cors(corsOptions));
app.use("/user", user);

app.use((req, res, next) => {
	const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
	if (ip !== "::1" && ip !== "91.170.53.249") {
		return res.status(403).json({ error: "You are not allowed" });
	}
	next();
});
app.get("/", (req, res) => {
	res.sendFile(__dirname + "/public/index.html");
});

app.get("/stats", async (req, res) => {
	try {
		res.json({
			Users: (await getAllUser()).length,
			OnlineUsers: global.onlineUsers.size,
			Servers: (await getAllServer()).length,
		});
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
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

	socket.on("GetChannels", (serverId) => {
		GetChannels(serverId);
	});

	socket.on("GetMessages", (srvParams) => {
		GetMessages(srvParams);
	});

	socket.on("SendMessages", (params) => {
		SendMessages(params);
	});

	socket.on("JoinChannel", (params) => {
		console.log(socket.id + " joined " + params.channelId);
	});

	socket.on("disconnect", () => {
		disconnect_user(socket.id);
	});
});
