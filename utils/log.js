const fs = require('fs');
const logs = [];

function logToFile(msg) {
    const currentDate = new Date();
    const dateString = currentDate.toISOString().slice(0, 10);
    const logEntry = `[${currentDate.toISOString().slice(0, 19).replace('T', ' ')}] ${msg}\n`;
    fs.appendFileSync(`logs/app_${dateString}.log`, logEntry);
}


function logWithTime(msg) {
  logToFile(msg);
}

function addLogEntry(method, url, status, responseTime) {
  const logEntry = {
    method,
    url,
    status,
    responseTime,
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
  };

  logs.push(logEntry);
  logToFile(JSON.stringify(logEntry));
}

module.exports = { logToFile, logWithTime, addLogEntry };