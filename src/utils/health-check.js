/**
 * Health Check System
 * Monitors bot status, API health, system resources, and provides health endpoints
 */

const logger = require("./logger");
const config = require("../config");
const os = require("os");
const fs = require("fs").promises;
const path = require("path");

class HealthCheckSystem {
  constructor() {
    if (HealthCheckSystem.instance) {
      return HealthCheckSystem.instance;
    }

    this.healthStatus = {
      overall: "healthy", // healthy, degraded, unhealthy
      lastCheck: new Date(),
      uptime: process.uptime(),
      checks: {},
    };

    this.checkInterval = null;
    this.alertCallbacks = [];
    
    // Store the instance
    HealthCheckSystem.instance = this;
  }

  /**
   * Initialize health monitoring system
   * @param {Object} client - Discord client
   */
  initialize(client) {
    this.client = client;
    this.startPeriodicChecks();
    logger.info("Health check system initialized");
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks() {
    // Run health checks every 30 seconds
    this.checkInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 30000);

    // Initial check
    this.performHealthChecks();
  }

  /**
   * Stop health monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info("Health check system stopped");
  }

  /**
   * Perform all health checks
   */
  async performHealthChecks() {
    try {
      const checks = {
        discord: await this.checkDiscordHealth(),
        system: await this.checkSystemHealth(),
        apis: await this.checkExternalAPIs(),
        memory: await this.checkMemoryUsage(),
        storage: await this.checkStorageHealth(),
      };

      // Update health status
      this.healthStatus = {
        overall: this.calculateOverallHealth(checks),
        lastCheck: new Date(),
        uptime: process.uptime(),
        checks,
      };

      // Log any issues
      this.logHealthIssues(checks);

      // Trigger alerts if needed
      await this.checkAlerts(checks);

    } catch (error) {
      logger.error("Error performing health checks:", error);
      this.healthStatus.overall = "unhealthy";
    }
  }

  /**
   * Check Discord connection health
   */
  async checkDiscordHealth() {
    try {
      const status = {
        connected: false,
        ready: false,
        ping: 0,
        guilds: 0,
        uptime: 0,
        status: "healthy",
      };

      if (this.client) {
        status.connected = this.client.readyAt !== null;
        status.ready = this.client.isReady();
        status.ping = this.client.ws.ping;
        status.guilds = this.client.guilds.cache.size;
        status.uptime = this.client.uptime;

        // Determine status based on connection and ping
        if (!status.connected || !status.ready) {
          status.status = "unhealthy";
        } else if (status.ping > 1000) {
          status.status = "degraded";
        }
      } else {
        status.status = "unhealthy";
      }

      return status;
    } catch (error) {
      logger.error("Discord health check failed:", error);
      return { status: "unhealthy", error: error.message };
    }
  }

  /**
   * Check system resource health
   */
  async checkSystemHealth() {
    try {
      const status = {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpuUsage: process.cpuUsage(),
        loadAverage: os.loadavg(),
        freeMemory: os.freemem(),
        totalMemory: os.totalmem(),
        uptime: os.uptime(),
        status: "healthy",
      };

      // Calculate memory usage percentage
      const memoryUsage = ((status.totalMemory - status.freeMemory) / status.totalMemory) * 100;
      
      // Check for issues
      if (memoryUsage > 90) {
        status.status = "unhealthy";
      } else if (memoryUsage > 75) {
        status.status = "degraded";
      }

      status.memoryUsagePercent = Math.round(memoryUsage);

      return status;
    } catch (error) {
      logger.error("System health check failed:", error);
      return { status: "unhealthy", error: error.message };
    }
  }

  /**
   * Check external API health
   */
  async checkExternalAPIs() {
    const apiChecks = {};

    // Check Weather API
    try {
      const weatherHealthy = await this.checkWeatherAPI();
      apiChecks.weather = weatherHealthy;
    } catch (error) {
      apiChecks.weather = { status: "unhealthy", error: error.message };
    }

    // Check Telegram API (if enabled)
    if (config.features.enableTelegram && config.bot.telegramToken) {
      try {
        const telegramHealthy = await this.checkTelegramAPI();
        apiChecks.telegram = telegramHealthy;
      } catch (error) {
        apiChecks.telegram = { status: "unhealthy", error: error.message };
      }
    }

    return apiChecks;
  }

  /**
   * Check Weather API health
   */
  async checkWeatherAPI() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `http://api.weatherapi.com/v1/current.json?key=${config.api.weatherKey}&q=Tehran`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        return { status: "healthy", responseTime: Date.now() };
      } else {
        return { status: "degraded", httpStatus: response.status };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return { status: "unhealthy", error: "timeout" };
      }
      return { status: "unhealthy", error: error.message };
    }
  }

  /**
   * Check Telegram API health
   */
  async checkTelegramAPI() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `https://api.telegram.org/bot${config.bot.telegramToken}/getMe`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        return { status: "healthy", responseTime: Date.now() };
      } else {
        return { status: "degraded", httpStatus: response.status };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return { status: "unhealthy", error: "timeout" };
      }
      return { status: "unhealthy", error: error.message };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemoryUsage() {
    try {
      const memUsage = process.memoryUsage();
      
      const status = {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers,
        status: "healthy",
      };

      // Convert to MB for easier reading
      status.rssMB = Math.round(status.rss / 1024 / 1024);
      status.heapUsedMB = Math.round(status.heapUsed / 1024 / 1024);
      status.heapTotalMB = Math.round(status.heapTotal / 1024 / 1024);

      // Check for memory issues
      if (status.heapUsedMB > 512) {
        status.status = "unhealthy";
      } else if (status.heapUsedMB > 256) {
        status.status = "degraded";
      }

      return status;
    } catch (error) {
      logger.error("Memory check failed:", error);
      return { status: "unhealthy", error: error.message };
    }
  }

  /**
   * Check storage health
   */
  async checkStorageHealth() {
    try {
      const status = {
        accessible: false,
        writable: false,
        status: "healthy",
      };

      // Check if we can read the current directory
      try {
        await fs.access(process.cwd(), fs.constants.R_OK);
        status.accessible = true;
      } catch (error) {
        status.status = "unhealthy";
        status.accessError = error.message;
      }

      // Check if we can write to temp directory
      try {
        const testFile = path.join(process.cwd(), '.health-check-test');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        status.writable = true;
      } catch (error) {
        status.status = "degraded";
        status.writeError = error.message;
      }

      return status;
    } catch (error) {
      logger.error("Storage check failed:", error);
      return { status: "unhealthy", error: error.message };
    }
  }

  /**
   * Calculate overall health status
   */
  calculateOverallHealth(checks) {
    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;
    let totalChecks = 0;

    const countStatus = (check) => {
      totalChecks++;
      switch (check.status) {
        case "healthy":
          healthyCount++;
          break;
        case "degraded":
          degradedCount++;
          break;
        case "unhealthy":
          unhealthyCount++;
          break;
      }
    };

    // Count main checks
    Object.values(checks).forEach(check => {
      if (check.status) {
        countStatus(check);
      } else if (typeof check === 'object') {
        // For nested checks like APIs
        Object.values(check).forEach(subCheck => {
          if (subCheck.status) {
            countStatus(subCheck);
          }
        });
      }
    });

    // Determine overall status
    if (unhealthyCount > 0) {
      return "unhealthy";
    } else if (degradedCount > 0) {
      return "degraded";
    } else {
      return "healthy";
    }
  }

  /**
   * Log health issues
   */
  logHealthIssues(checks) {
    Object.entries(checks).forEach(([checkName, result]) => {
      if (result.status === "unhealthy") {
        logger.warn(`Health check failed: ${checkName}`, result);
      } else if (result.status === "degraded") {
        logger.warn(`Health check degraded: ${checkName}`, result);
      }
    });
  }

  /**
   * Check and trigger alerts
   */
  async checkAlerts(checks) {
    // Trigger alerts for any callback functions
    for (const callback of this.alertCallbacks) {
      try {
        await callback(this.healthStatus, checks);
      } catch (error) {
        logger.error("Error in health alert callback:", error);
      }
    }
  }

  /**
   * Add alert callback
   */
  addAlertCallback(callback) {
    this.alertCallbacks.push(callback);
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    return { ...this.healthStatus };
  }

  /**
   * Get health status as HTTP response format
   */
  getHealthResponse() {
    const status = this.getHealthStatus();
    
    return {
      status: status.overall,
      timestamp: status.lastCheck.toISOString(),
      uptime: Math.floor(status.uptime),
      checks: status.checks,
      version: process.env.npm_package_version || "1.0.0",
    };
  }

  /**
   * Format health status for Discord embed
   */
  formatHealthEmbed() {
    const status = this.getHealthStatus();
    const uptimeHours = Math.floor(status.uptime / 3600);
    const uptimeMinutes = Math.floor((status.uptime % 3600) / 60);

    const embed = {
      color: status.overall === "healthy" ? 0x00ff00 : 
             status.overall === "degraded" ? 0xffff00 : 0xff0000,
      title: "🏥 Bot Health Status",
      description: `**Overall Status:** ${status.overall.toUpperCase()}`,
      fields: [
        {
          name: "⏰ Uptime",
          value: `${uptimeHours}h ${uptimeMinutes}m`,
          inline: true,
        },
        {
          name: "🤖 Discord",
          value: status.checks.discord?.connected ? "✅ Connected" : "❌ Disconnected",
          inline: true,
        },
        {
          name: "💾 Memory",
          value: `${status.checks.memory?.heapUsedMB || 0}MB used`,
          inline: true,
        },
      ],
      timestamp: status.lastCheck.toISOString(),
      footer: {
        text: "Last checked",
      },
    };

    return embed;
  }
}

module.exports = HealthCheckSystem;
