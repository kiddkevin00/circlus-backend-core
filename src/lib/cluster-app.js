/**
 * The process of the web application begins here - cluster mode.
 *
 * Usage: Run `$ NODE_DEBUG=cluster node src/lib/cluster-app.js`.
 */

const setupExpressServer = require('./servers/express.server');
const setupRoutes = require('./routes/');
const packageJson = require('../../package.json');
const express = require('express');
const cluster = require('cluster');
const http = require('http');
const os = require('os');


const numCPUs = os.cpus().length;

if (cluster.isMaster) {
  // Forks the master worker.
  for (let i = 0; i < numCPUs; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', (worker/*, code, signal*/) => {
    // [TODO] Replace with logger module.
    console.log(`Worker ${worker.process.pid} died`);
  });
} else {
  // Forked Workers can share a new TCP connection.
  const app = express();
  const server = http.createServer(app);

  setupExpressServer(app);
  setupRoutes(app);

  const webServer = server.listen(packageJson.config.port, packageJson.config.ip, () => {
    // [TODO] Replace with logger module.
    console.log('Express server listening on port: %d at IP: %s, in %s mode',
      webServer.address().port,
      webServer.address().address, app.get('env'));
  });
}

module.exports = exports = cluster;
