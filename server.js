const app = require('./src/javascript');
const http = require('http');
const config = require("./src/javascript/utils/yaml-config")("service.msapi.yaml")


/**
 * Normalize a port into a number, string, or false.
 */
const normalizePort = (val) => {
  const port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Get port from environment and store in Express.
 */
const port = normalizePort(process.env.PORT || config.service.port || '8080');
app.set('port', port);

/**
 * Event listener for HTTP server "error" event.
 */
const onError = (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.fatal(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.fatal(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
const onListening = () => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
  console.debug(`!!!SERVICE-DB-REST SERVICE for starts on ${bind} in ${config.service.mode} mode.`);
}

/**
 * Create HTTP server.
 */
const server = http.createServer(app);

(() => {
		server.listen(port);
		server.on('error', onError);
		server.on('listening', onListening);
		
})()
module.exports = server