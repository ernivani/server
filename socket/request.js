const connection = require("../config/dbConfig.js");

const add_user = (userId, socketId) => {
    onlineUsers.set(socketId, userId);
    console.log(onlineUsers);
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
            console.log(err);
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
            console.log(serverList);
            chatSocket.emit("server-list", serverList);
        }
    });
};

const get_channel_by_server = async (paramss) => {
    const serverId = paramss.serverId;
    const userId = paramss.userId;
    const query = `SELECT c.id, c.name, c.type
    FROM channels c
    WHERE c.server_id = ?
    `;
    const params = [serverId];
    connection.query(query, params, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            const channelList = result.map((channel) => {
                return {
                    id: channel.id,
                    name: channel.name,
                    type: channel.type,
                };
            });
            chatSocket.emit("channel-list", channelList);
        }
    });
};

const create_server = async (params) => {
    const query =
        "INSERT INTO servers (name, owner_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())";
    const param = [params.serverName, params.userId];
    connection.query(query, param, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            const serverId = result.insertId;
            const query =
                "INSERT INTO server_members (server_id, user_id, joined_at) VALUES (?, ?, NOW())";
            const params = [serverId, param[1]];
            connection.query(query, params, async (err, result) => {
                if (err) {
                    console.log(err);
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

const initialize_server = async (serverId) => {
    // Insert voice channel
    const voiceChannelQuery =
        'INSERT INTO channels (server_id, name, type, created_at, updated_at) VALUES (?, ?, "voice", NOW(), NOW())';
    const voiceChannelParams = [serverId, "Voice Channel"];
    connection.query(voiceChannelQuery, voiceChannelParams, (err, result) => {
        if (err) {
            console.log(err);
        }
    });

    // Insert category channel
    const categoryChannelQuery =
        'INSERT INTO channels (server_id, name, type, created_at, updated_at) VALUES (?, ?, "category", NOW(), NOW())';
    const categoryChannelParams = [serverId, "Category Channel"];
    connection.query(
        categoryChannelQuery,
        categoryChannelParams,
        (err, result) => {
            if (err) {
                console.log(err);
            }
        }
    );
    // Insert text channel
    let cname;
    let cid;
    let ctype;
    const textChannelQuery =
        'INSERT INTO channels (server_id, name, type, created_at, updated_at) VALUES (?, ?, "text", NOW(), NOW())';
    const textChannelParams = [serverId, "Text Channel"];
    return new Promise((resolve, reject) => {
        connection.query(textChannelQuery, textChannelParams, (err, result) => {
            if (err) {
                console.log(err);
            } else {
                cname = "Text Channel";
                cid = result.insertId;
                ctype = "text";
                resolve({ cname, cid, ctype });
            }
        });
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
    get_channel_by_server,
};
