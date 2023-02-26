const fs = require('fs');


function logToFile(msg) {
    const currentDate = new Date();
    const dateString = currentDate.toISOString().slice(0, 10);
    const logEntry = `[${currentDate.toISOString().slice(0, 19).replace('T', ' ')}] ${msg}\n`;
    fs.appendFileSync(`logs/app_${dateString}.log`, logEntry);
}

module.exports = { logToFile };