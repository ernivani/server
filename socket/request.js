const connection = require("../config/dbConfig.js");

const add_user = (userId, socketId) => {
	onlineUsers.set(socketId, userId);
};

const getAllServer = async () => {
	const query = "SELECT * FROM servers";
	return new Promise((resolve, reject) => {
		connection.query(query, (err, result) => {
			if (err) {
				console.error(err);
				reject(err);
			} else {
				const serverList = result.map((server) => {
					return {
						id: server.id,
						name: server.name,
					};
				});
				resolve(serverList);
			}
		});
	});
};

const getAllUser = async () => {
	const query = "SELECT * FROM user_information";
	return new Promise((resolve, reject) => {
		connection.query(query, (err, result) => {
			if (err) {
				console.error(err);
				reject(err);
			} else {
				const userList = result.map((user) => {
					return {
						id: user.id,
						name: user.name,
					};
				});
				resolve(userList);
			}
		});
	});
};

const get_server_list = async (userId) => {
	const query = `SELECT s.id, s.name, GROUP_CONCAT(c.name) AS cname, GROUP_CONCAT(c.type) AS ctype, GROUP_CONCAT(c.id) AS cid
    FROM servers s
    JOIN server_members sm ON s.id = sm.server_id
    JOIN channels c ON s.id = c.server_id
    WHERE sm.user_id = ?
    AND c.type = "text"
    GROUP BY s.id
    `;

	const params = [userId];
	connection.query(query, params, (err, result) => {
		if (err) {
			console.error(err);
		} else {
			// serverList = id name
			const serverList = result.map((server) => {
				return {
					id: server.id,
					name: server.name,
					cname: server.cname,
					ctype: server.ctype,
					cid: server.cid,
				};
			});
			chatSocket.emit("server-list", serverList);
		}
	});
};

const GetChannels = async (serverId) => {
	const query = `SELECT c.id, c.name, c.type, c.parent_id
    FROM channels c
    WHERE c.server_id = ?
    `;
	const params = [serverId.serverId];
	connection.query(query, params, (err, result) => {
		if (err) {
			console.error(err);
		} else {
			const channelList = result.map((channel) => {
				return {
					id: channel.id,
					name: channel.name,
					type: channel.type,
					parent_id: channel.parent_id,
				};
			});
			chatSocket.emit("GetChannels", channelList);
		}
	});
};

const create_server = async (params) => {
	const query =
		"INSERT INTO servers (name, owner_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())";
	const param = [params.serverName, params.userId];
	connection.query(query, param, (err, result) => {
		if (err) {
			console.error(err);
		} else {
			const serverId = result.insertId;
			const query =
				"INSERT INTO server_members (server_id, user_id, joined_at) VALUES (?, ?, NOW())";
			const params = [serverId, param[1]];
			connection.query(query, params, async (err, result) => {
				if (err) {
					console.error(err);
				} else {
					const first_channel = await initialize_server(serverId);
					const server = {
						id: serverId,
						name: param[0],
						cname: first_channel.cname,
						ctype: first_channel.ctype,
						cid: first_channel.cid,
					};
					io.emit("server-created", server);
				}
			});
		}
	});
};

const join_server = async (params) => {
	// const query =
	//     "INSERT INTO server_members (server_id, user_id, joined_at) VALUES (?, ?, NOW())";
	// const params = [params.serverId, params.userId];
};

const initialize_server = (serverId) => {
	return new Promise((resolve, reject) => {
		// Insert category channel
		const categoryChannelQuery =
			'INSERT INTO channels (server_id, name, type, created_at, updated_at) VALUES (?, ?, "category", NOW(), NOW())';
		const categoryChannelParams = [serverId, "Category Channel"];
		connection.query(
			categoryChannelQuery,
			categoryChannelParams,
			(err, result) => {
				if (err) {
					console.error(err);
					reject(err);
					return;
				}

				// Store the id of the inserted category channel to use as parent_id later
				const categoryId = result.insertId;

				// Insert voice channel
				const voiceChannelQuery =
					'INSERT INTO channels (server_id, name, type, parent_id, created_at, updated_at) VALUES (?, ?, "voice", ?, NOW(), NOW())';
				const voiceChannelParams = [
					serverId,
					"Voice Channel",
					categoryId,
				];
				connection.query(
					voiceChannelQuery,
					voiceChannelParams,
					(err, result) => {
						if (err) {
							console.error(err);
							reject(err);
							return;
						}
					}
				);

				// Insert text channel
				const textChannelQuery =
					'INSERT INTO channels (server_id, name, type, parent_id, created_at, updated_at) VALUES (?, ?, "text", ?, NOW(), NOW())';
				const textChannelParams = [
					serverId,
					"Text Channel",
					categoryId,
				];
				connection.query(
					textChannelQuery,
					textChannelParams,
					(err, result) => {
						if (err) {
							console.error(err);
							reject(err);
							return;
						} else {
							const cname = "Text Channel";
							const cid = result.insertId;
							const ctype = "text";
							resolve({ cname, cid, ctype });
						}
					}
				);
			}
		);
	});
};

const GetMessages = async (params) => {
	const query = `
	  SELECT m.id, m.message_text, m.channel_id, m.sender_id, m.created_at, m.updated_at, u.username
	  FROM messages m
	  JOIN user_information u ON m.sender_id = u.id
	  WHERE m.channel_id = ? AND m.server_id = ? -- Added "AND" condition
	  ORDER BY m.created_at ASC
	`;
	const param = [params.channelId, params.serverId];
	connection.query(query, param, (err, result) => {
		if (err) {
			console.error(err);
		} else {
			const messages = result.map((message) => {
				return {
					id: message.id,
					content: message.message_text, // Fixed column name
					created_at: message.created_at,
					updated_at: message.updated_at,

					user: {
						id: message.sender_id,
						name: message.username,
						avatar: message.avatar,
					},
				};
			});
			chatSocket.emit("GetMessages", messages);
		}
	});
};

const SendMessages = async (params) => {
	const query = `
	  INSERT INTO messages (message_text, channel_id, sender_id, server_id, created_at, updated_at)
	  VALUES (?, ?, ?, ?, NOW(), NOW())
	`;
	const param = [
		params.content,
		params.channelId,
		params.userId,
		params.serverId,
	];
	connection.query(query, param, (err, result) => {
		if (err) {
			console.error(err);
		} else {
			messageid = result.insertId;
			io.emit("SendMessages", {
				id: messageid,
				content: params.content,
				created_at: new Date(),
				updated_at: new Date(),
				user: {
					id: params.userId,
					name: params.username,
					avatar: params.avatar,
				},
			});
		}
	});
};

const disconnect_user = (socketId) => {
	onlineUsers.delete(socketId);
};

module.exports = {
	add_user,
	get_server_list,
	create_server,
	disconnect_user,
	GetChannels,
	getAllServer,
	getAllUser,
	GetMessages,
	SendMessages,
};
