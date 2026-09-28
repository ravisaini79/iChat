const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'server_startup.log');
// reset log file
fs.writeFileSync(logFile, '');

function writeLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
}

writeLog('Starting IChat server launcher...');

process.on('uncaughtException', (err) => {
  writeLog('UNCAUGHT EXCEPTION: ' + err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  writeLog('UNHANDLED REJECTION: ' + (reason ? (reason.stack || reason) : reason));
});

writeLog('Requiring dist/main.js...');
require('./dist/main.js');
