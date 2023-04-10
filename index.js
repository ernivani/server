const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");
const port = process.env.PORT || 3000;
const user = require("./Routes/userRoutes.js");
const server = http.createServer(app);
const jwt = require("jsonwebtoken");
const connection = require("./config/dbConfig.js");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

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

// List of connected sockets
global.connectedSockets = {};

// Function to verify and add a socket to the list of connected sockets
const connectSocket = async (socket, token) => {
  try {
    const decoded = jwt.verify(token, "ernitropbg");
    socket.id = decoded.userId.toString();
    console.log("New socket id:", socket.id);

    connectedSockets[socket.id] = socket; // Add the socket to the list of connected sockets
  } catch (err) {
    console.log("Error:", err);
  }
};

// Event handler for friend requests
const handleFriendRequest = async (socket, data) => {
  if (!data.receiverId) {
    console.log("No receiverId");
    return;
  }
  if (socket.id === data.receiverId) {
    console.log("Can't send friend request to yourself");
    return;
  }

  console.log(`Friend request from ${socket.id} to ${data.receiverId}`);

  const checkFriendshipQuery = `
      SELECT * FROM user_friendships
      WHERE (user_id1 = ? AND user_id2 = ?) OR (user_id1 = ? AND user_id2 = ?)
  `;

  connection.query(
    checkFriendshipQuery,
    [socket.id, data.receiverId, data.receiverId, socket.id],
    (err, result) => {
      if (err) {
        console.error("Error checking friendship:", err);
        return;
      }

      if (result.length > 0) {
        console.log("Friendship or friend request already exists");
        return;
      }

      const insertFriendRequestQuery = `
          INSERT INTO user_friendships (user_id1, user_id2, status, action_user_id, created_at, updated_at)
          VALUES (?, ?, 'pending', ?, NOW(), NOW())
      `;

      connection.query(
        insertFriendRequestQuery,
        [socket.id, data.receiverId, socket.id],
        (err, result) => {
          if (err) {
            console.error("Error inserting friend request:", err);
            return;
          }
          console.log("Friend request inserted into the database:", result);

          handleGetFriend(socket, data);
          if (connectedSockets[data.receiverId]) {
            connectedSockets[data.receiverId].emit("friend_request_received", {
              user_id1: socket.id,
              user_id2: data.receiverId,
              status: "pending",
              action_user_id: socket.id,
            });
          }
        }
      );
    }
  );
};
// Gestionnaire d'événements pour récupérer les demandes d'ami
const handleGetFriend = async (socket, data) => {
    // Select status from user_friendships and select username from user_information
    const getFriendshipsQuery = `
        SELECT uf.*, ui.username
        FROM user_friendships uf
        JOIN user_information ui ON (uf.user_id1 = ui.id OR uf.user_id2 = ui.id) AND ui.id != ?
        WHERE uf.user_id1 = ? OR uf.user_id2 = ?
    `;

    connection.query(getFriendshipsQuery, [socket.id, socket.id, socket.id], (err, result) => {
        if (err) {
            console.error("Error getting friendships:", err);
            return;
        }

        const pendingRequests = [];
        const friends = [];

        for (const friendship of result) {
            const friendId = friendship.user_id1 === socket.id ? friendship.user_id2 : friendship.user_id1;
            const friendData = {
                id: friendId,
                username: friendship.username,
                status: friendship.status
            };

            if (friendship.status === 'pending') {
                pendingRequests.push(friendData);
            } else if (friendship.status === 'accepted') {
                friends.push(friendData);
            }
        }

        try {
            socket.emit("friend_requests", pendingRequests);
            socket.emit("friends_list", friends);
        } catch (error) {
            console.log("Error while emitting friend_requests and friends_list:", error);
        }
    });
};

// Gestionnaire d'événements pour accepter les demandes d'ami
const handleAcceptFriendRequest = async (socket, data) => {
    // Modifier la base de données pour accepter la demande d'ami 'pending'
    const updateFriendRequestQuery = `
        UPDATE user_friendships
        SET status = 'accepted', action_user_id = ?, updated_at = NOW()
        WHERE (user_id1 = ? AND user_id2 = ?) AND status = 'pending' 
    `;
    console.log(data)
    connection.query(
        updateFriendRequestQuery,
        [socket.id, data.senderId, socket.id],
        (err, result) => {
            if (err) {
                console.error("Error updating friend request:", err);
                return;
            }
            console.log("Friend request accepted:", result);

            // Parcourt la liste des sockets connectés pour trouver l'utilisateur qui a envoyé la demande d'ami
            for (const [_, connectedSocket] of Object.entries(connectedSockets)) {
                // Si le socket correspond à l'utilisateur qui a envoyé la demande, émet l'événement 'friend_request_accepted'
                if (connectedSocket.id === data.senderId) {
                    console.log("Emit friend_request_accepted to", connectedSocket.id);
                    try {
                        connectedSocket.emit("friend_request_accepted", {
                            senderId: data.senderId,
                            receiverId: socket.id,
                        });
                    } catch (error) {
                        console.log("Error while emitting friend_request_accepted:", error);
                    }
                }
            }

            // Mettre à jour la liste des amis de l'utilisateur
            handleGetFriend(socket, data);
        }
    );
};

const handleCancelFriendRequest = async (socket, data) => {
    const deleteFriendRequestQuery = `
      DELETE FROM user_friendships
      WHERE user_id1 = ? AND user_id2 = ? AND status = 'pending'
    `;
    connection.query(deleteFriendRequestQuery, [data.senderId, data.receiverId], (err, result) => {
      if (err) {
        console.error("Error deleting friend request:", err);
        return;
      }
      console.log("Friend request canceled:", result);
  
      // Update the friend request list of the current user
      handleGetFriend(socket, data);
    });


    for (const [_, connectedSocket] of Object.entries(connectedSockets)) {

        if (data.receiverId == connectedSocket.id) {
            console.log("Emit friend_request_canceled to", connectedSocket.id);
            try {
                connectedSocket.emit("friend_request_canceled", data);
            } catch (error) {
                console.log("Error while emitting friend_request_canceled:", error);
            }
        }
    }
};
  

const handleDeclineFriendRequest = async (socket, data) => {
    // Modifier la base de données pour refuser la demande d'ami 'pending'
    const updateFriendRequestQuery = `
        Delete FROM user_friendships
        WHERE (user_id1 = ? AND user_id2 = ?) AND status = 'pending'
    `;
    connection.query(
        updateFriendRequestQuery,
        [ data.senderId, socket.id],
        (err, result) => {
            if (err) {
                console.error("Error updating friend request:", err);
                return;
            }
            console.log("Friend request declined:", result);

            // Mettre à jour la liste des demandes d'ami de l'utilisateur
            handleGetFriend(socket, data);

            // Parcourt la liste des sockets connectés pour trouver l'utilisateur qui a envoyé la demande d'ami
            for (const [_, connectedSocket] of Object.entries(connectedSockets)) {
                // Si le socket correspond à l'utilisateur qui a envoyé la demande, émet l'événement 'friend_request_declined'
                if (connectedSocket.id === data.senderId) {
                    console.log("Emit friend_request_declined to", connectedSocket.id);
                    try {
                        connectedSocket.emit("friend_request_declined", {
                            senderId: data.senderId,
                            receiverId: socket.id,
                        });
                    } catch (error) {
                        console.log("Error while emitting friend_request_declined:", error);
                    }
                }
            }
        }

    );
};

const handleDeleteFriend = async (socket, data) => {
    // todo: Modifier la base de données pour supprimer l'ami
    // et actualiser la liste des amis des deux utilisateurs
};


// Gestionnaire d'événements pour les déconnexions
const handleDisconnect = (socket) => {
    console.log("A user disconnected");
    delete connectedSockets[socket.id]; // Retire le socket de la liste des sockets connectés
};

io.on("connection", (socket) => {
    console.log("A user connected");

    // Connecte le socket à la liste des sockets connectés
    connectSocket(socket, socket.handshake.query.token);

    // Gestionnaire d'événements
    socket.on("friend_request", (data) => handleFriendRequest(socket, data));
    socket.on("get_friend_request", (data) => handleGetFriend(socket, data));
    socket.on("accept_friend_request", (data) => handleAcceptFriendRequest(socket, data));
    socket.on("decline_friend_request", (data) => handleDeclineFriendRequest(socket, data));
    socket.on("cancel_friend_request", (data) => handleCancelFriendRequest(socket, data));
    socket.on("disconnect", () => handleDisconnect(socket));
});
