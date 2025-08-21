const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../utils/logger");
const HealthCheckSystem = require("../utils/health-check");

// Get health check system instance
const healthSystem = new HealthCheckSystem();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("health")
    .setDescription("Check bot health and system status"),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Get current health status
      const healthStatus = healthSystem.getHealthStatus();
      
      // Create detailed health embed
      const embed = new EmbedBuilder()
        .setColor(
          healthStatus.overall === "healthy" ? "#00ff00" :
          healthStatus.overall === "degraded" ? "#ffff00" : "#ff0000"
        )
        .setTitle("🏥 Bot Health Status")
        .setDescription(`**Overall Status:** ${healthStatus.overall.toUpperCase()}`)
        .setTimestamp(healthStatus.lastCheck)
        .setFooter({ text: "Last health check" });

      // Uptime calculation
      const uptimeHours = Math.floor(healthStatus.uptime / 3600);
      const uptimeMinutes = Math.floor((healthStatus.uptime % 3600) / 60);
      const uptimeSeconds = Math.floor(healthStatus.uptime % 60);

      embed.addFields(
        {
          name: "⏰ System Uptime",
          value: `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`,
          inline: true,
        }
      );

      // Discord Health
      if (healthStatus.checks.discord) {
        const discord = healthStatus.checks.discord;
        const discordStatus = discord.connected ? "🟢 Connected" : "🔴 Disconnected";
        const ping = discord.ping ? `${discord.ping}ms` : "N/A";
        const guilds = discord.guilds || 0;

        embed.addFields({
          name: "🤖 Discord Connection",
          value: `**Status:** ${discordStatus}\n**Ping:** ${ping}\n**Servers:** ${guilds}`,
          inline: true,
        });
      }

      // System Health
      if (healthStatus.checks.system) {
        const system = healthStatus.checks.system;
        const memUsage = system.memoryUsagePercent || 0;
        const memStatus = memUsage > 90 ? "🔴" : memUsage > 75 ? "🟡" : "🟢";

        embed.addFields({
          name: "💻 System Resources",
          value: `**Memory:** ${memStatus} ${memUsage}% used\n**Platform:** ${system.platform}\n**Node:** ${system.nodeVersion}`,
          inline: true,
        });
      }

      // Memory Details
      if (healthStatus.checks.memory) {
        const memory = healthStatus.checks.memory;
        const memStatus = memory.status === "healthy" ? "🟢" : memory.status === "degraded" ? "🟡" : "🔴";

        embed.addFields({
          name: "💾 Memory Usage",
          value: `**Status:** ${memStatus} ${memory.status}\n**Heap Used:** ${memory.heapUsedMB}MB\n**RSS:** ${memory.rssMB}MB`,
          inline: true,
        });
      }

      // External APIs
      if (healthStatus.checks.apis) {
        const apis = healthStatus.checks.apis;
        let apiStatus = "";

        if (apis.weather) {
          const weatherIcon = apis.weather.status === "healthy" ? "🟢" : apis.weather.status === "degraded" ? "🟡" : "🔴";
          apiStatus += `**Weather API:** ${weatherIcon} ${apis.weather.status}\n`;
        }

        if (apis.telegram) {
          const telegramIcon = apis.telegram.status === "healthy" ? "🟢" : apis.telegram.status === "degraded" ? "🟡" : "🔴";
          apiStatus += `**Telegram API:** ${telegramIcon} ${apis.telegram.status}\n`;
        }

        if (apiStatus) {
          embed.addFields({
            name: "🌐 External APIs",
            value: apiStatus.trim(),
            inline: true,
          });
        }
      }

      // Storage Health
      if (healthStatus.checks.storage) {
        const storage = healthStatus.checks.storage;
        const storageIcon = storage.status === "healthy" ? "🟢" : storage.status === "degraded" ? "🟡" : "🔴";
        
        embed.addFields({
          name: "💿 Storage",
          value: `**Status:** ${storageIcon} ${storage.status}\n**Readable:** ${storage.accessible ? "✅" : "❌"}\n**Writable:** ${storage.writable ? "✅" : "❌"}`,
          inline: true,
        });
      }

      // Add performance info
      embed.addFields({
        name: "📊 Performance",
        value: `**Health Checks:** Every 30s\n**Last Check:** <t:${Math.floor(healthStatus.lastCheck.getTime() / 1000)}:R>\n**Response Time:** ${Date.now() - interaction.createdTimestamp}ms`,
        inline: false,
      });

      await interaction.editReply({
        embeds: [embed],
      });

      logger.info(`Health status checked by user ${interaction.user.tag}`);

    } catch (error) {
      logger.error("Error in health command:", error);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("❌ Health Check Error")
        .setDescription("Unable to retrieve health status at the moment.")
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};
