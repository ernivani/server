# Node.js Server

This is a chat server built with Node.js and Socket.IO. Users can register, log in, and join chat rooms to communicate with others in real-time.

## Setup

1. Clone the repository to your local machine.
2. Run `npm install` to install the dependencies.
3. Run `npm start` to start the server.


## Database

The database is a MySQL database. The database have a trigger that deletes expired tokens every day.

```sql
DELIMITER //

CREATE EVENT delete_expired_tokens
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
    DELETE FROM password_reset
    WHERE reset_password_token IS NOT NULL
    AND TIMESTAMPDIFF(DAY, token_created_at, NOW()) >= 1;
     
END//

DELIMITER ;

SET GLOBAL event_scheduler = ON;

```