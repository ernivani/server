# Node.js Server

This is a chat server built with Node.js and Socket.IO. Users can register, log in, and join chat rooms to communicate with others in real-time.

## Setup

1. Clone the repository to your local machine.
2. Run `npm install` to install the dependencies.
3. Create a `.env` file in the root directory with the following contents:

    ```
    SECRET_KEY=your-secret-key
    DB_HOST=localhost
    DB_USER=your_database_user
    DB_PASSWORD=your_database_password
    DB_NAME=your_database_name
    ```
4. Run `npm run` to start the server.

## Usage

The server use websockets to communicate with the client. The client can send the following messages to the server:

- `register`: Register a new user.
- `login`: Log in an existing user.
- `auth`: Check if the user is authenticated.
- `logout`: Log out the user.
- `getServer`: Get all servers the user has joined.

The server can send the following messages to the client:

- `registerResponse`: Response to a `register` message.
- `loginResponse`: Response to a `login` message.
- `authResponse`: Response to an `auth` message.
- `logoutResponse`: Response to a `logout` message.
- `getServerResponse`: Response to a `getServer` message.

## License
No