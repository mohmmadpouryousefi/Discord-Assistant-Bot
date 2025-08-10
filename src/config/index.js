/**
 * Centralized Configuration Management System
 *
 * This module manages all bot configuration including:
 * - Environment variables
 * - Default settings
 * - Feature toggles
 * - API configurations
 */

require("dotenv").config();

class Config {
  constructor() {
    this.validateRequiredEnvVars();
  }

  // Bot Configuration
  get bot() {
    return {
      token: process.env.DISCORD_BOT_TOKEN,
      clientId: process.env.CLIENT_ID,
      guildId: process.env.GUILD_ID,
      telegramToken: process.env.TELEGRAM_BOT_TOKEN,
      environment: process.env.NODE_ENV || "development",
      prefix: process.env.BOT_PREFIX || "!",
      ownerId: process.env.OWNER_ID,
    };
  }

  // Logging Configuration
  get logging() {
    return {
      level: process.env.LOG_LEVEL || "info",
      enableFileLogging: process.env.ENABLE_FILE_LOGGING !== "false",
      enableConsoleLogging: process.env.ENABLE_CONSOLE_LOGGING !== "false",
      maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE) || 5242880, // 5MB
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    };
  }

  // API Keys and External Services
  get apis() {
    return {
      weather: {
        key: process.env.WEATHER_API_KEY,
        baseUrl: process.env.WEATHER_API_URL || "https://api.weatherapi.com/v1",
        timeout: parseInt(process.env.WEATHER_API_TIMEOUT) || 5000,
      },
      openai: {
        key: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 150,
      },
      news: {
        key: process.env.NEWS_API_KEY,
        baseUrl: process.env.NEWS_API_URL || "https://newsapi.org/v2",
      },
      crypto: {
        baseUrl:
          process.env.CRYPTO_API_URL || "https://api.coingecko.com/api/v3",
      },
    };
  }

  // Feature Flags
  get features() {
    return {
      enableWeather: process.env.ENABLE_WEATHER !== "false",
      enableTelegram: process.env.ENABLE_TELEGRAM !== "false",
      enableMusic: process.env.ENABLE_MUSIC === "true",
      enableModeration: process.env.ENABLE_MODERATION === "true",
      enableAI: process.env.ENABLE_AI === "true",
      enableAnalytics: process.env.ENABLE_ANALYTICS === "true",
      enableDashboard: process.env.ENABLE_DASHBOARD === "true",
    };
  }

  // Command Configuration
  get commands() {
    return {
      globalCommands: process.env.USE_GLOBAL_COMMANDS === "true",
      commandCooldown: parseInt(process.env.COMMAND_COOLDOWN) || 3000, // 3 seconds
      maxCommandsPerMinute: parseInt(process.env.MAX_COMMANDS_PER_MINUTE) || 20,
      deleteInvalidCommands: process.env.DELETE_INVALID_COMMANDS === "true",
    };
  }

  // Server and Performance Configuration

  // Cache Configuration
  get cache() {
    return {
      enabled: process.env.ENABLE_CACHE !== "false",
      type: process.env.CACHE_TYPE || "memory", // memory, redis
      ttl: parseInt(process.env.CACHE_TTL) || 300000, // 5 minutes
      redisUrl: process.env.REDIS_URL,
    };
  }

  // Security Configuration

  // Notification Configuration

  // Validate required environment variables
  validateRequiredEnvVars() {
    const required = [
      "DISCORD_BOT_TOKEN",
      "CLIENT_ID",
      "GUILD_ID",
      "WEATHER_API_KEY",
    ];

    const missing = required.filter((env) => !process.env[env]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
      );
    }
  }

  // Get a summary of current configuration (for logging/debugging)
  getConfigSummary() {
    return {
      environment: this.bot.environment,
      logging: {
        level: this.logging.level,
        fileLogging: this.logging.enableFileLogging,
        consoleLogging: this.logging.enableConsoleLogging,
      },
      features: {
        weather: this.features.enableWeather,
        telegram: this.features.enableTelegram,
        music: this.features.enableMusic,
        moderation: this.features.enableModeration,
        ai: this.features.enableAI,
      },
      apis: {
        weatherConfigured: !!this.apis.weather.key,
        openaiConfigured: !!this.apis.openai.key,
        newsConfigured: !!this.apis.news.key,
      },
      commands: {
        cooldown: this.commands.commandCooldown,
        maxPerMinute: this.commands.maxCommandsPerMinute,
      },
    };
  }

  // Check if a specific feature is enabled
  isFeatureEnabled(featureName) {
    return (
      this.features[
        `enable${featureName.charAt(0).toUpperCase() + featureName.slice(1)}`
      ] || false
    );
  }

  // Get API configuration for a specific service
  getApiConfig(serviceName) {
    return this.apis[serviceName] || null;
  }

  // Development mode check
  isDevelopment() {
    return this.bot.environment === "development";
  }

  // Production mode check
  isProduction() {
    return this.bot.environment === "production";
  }
}

// Export a singleton instance
module.exports = new Config();
