const http = require('http');
const logger = require('./logger');

/**
 * Keep-Alive HTTP Server
 * Prevents the bot from sleeping on free hosting platforms
 * Provides a health check endpoint
 */
class KeepAliveServer {
  constructor(port = process.env.PORT || 3000) {
    this.port = port;
    this.server = null;
    this.startTime = new Date();
  }

  start() {
    this.server = http.createServer((req, res) => {
      const url = req.url;
      
      // Health check endpoint
      if (url === '/' || url === '/health') {
        const healthData = {
          status: 'online',
          uptime: this.getUptime(),
          timestamp: new Date().toISOString(),
          memory: this.getMemoryUsage(),
          version: process.version,
          platform: process.platform
        };

        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(healthData, null, 2));
        
        logger.info(`Health check accessed from ${req.connection.remoteAddress}`);
        return;
      }

      // Status endpoint
      if (url === '/status') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Discord Bot is running! ✅');
        return;
      }

      // Default response
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Discord Assistant Bot - Online and Ready! 🤖');
    });

    this.server.listen(this.port, () => {
      logger.info(`🌐 Keep-alive server running on port ${this.port}`);
      logger.info(`📊 Health check available at http://localhost:${this.port}/health`);
    });

    // Error handling
    this.server.on('error', (error) => {
      logger.error('Keep-alive server error:', error);
    });

    return this.server;
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        logger.info('Keep-alive server stopped');
      });
    }
  }

  getUptime() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  getMemoryUsage() {
    const used = process.memoryUsage();
    const memoryInfo = {};
    
    for (let key in used) {
      memoryInfo[key] = `${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`;
    }
    
    return memoryInfo;
  }
}

module.exports = KeepAliveServer;
