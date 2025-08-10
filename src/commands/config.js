const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Display bot configuration information")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("Show general configuration information")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("features").setDescription("Show enabled features")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("apis").setDescription("Show configured API services")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // Check if user is bot owner (if configured)
    if (config.bot.ownerId && interaction.user.id !== config.bot.ownerId) {
      return await interaction.reply({
        content: "❌ You don't have permission to view bot configuration.",
        ephemeral: true,
      });
    }

    let embed;

    switch (subcommand) {
      case "info":
        embed = new EmbedBuilder()
          .setTitle("🔧 Bot Configuration")
          .setColor(0x00ae86)
          .addFields(
            {
              name: "Environment",
              value: config.bot.environment,
              inline: true,
            },
            { name: "Prefix", value: config.bot.prefix, inline: true },
            { name: "Log Level", value: config.logging.level, inline: true },
            {
              name: "File Logging",
              value: config.logging.enableFileLogging
                ? "✅ Enabled"
                : "❌ Disabled",
              inline: true,
            },
            {
              name: "Console Logging",
              value: config.logging.enableConsoleLogging
                ? "✅ Enabled"
                : "❌ Disabled",
              inline: true,
            },
            {
              name: "Cache",
              value: config.cache.enabled
                ? `✅ ${config.cache.type}`
                : "❌ Disabled",
              inline: true,
            }
          )
          .setTimestamp();
        break;

      case "features":
        const features = config.features;
        const enabledFeatures = Object.entries(features)
          .filter(([_, enabled]) => enabled)
          .map(([feature, _]) => `✅ ${feature.replace("enable", "")}`);

        const disabledFeatures = Object.entries(features)
          .filter(([_, enabled]) => !enabled)
          .map(([feature, _]) => `❌ ${feature.replace("enable", "")}`);

        embed = new EmbedBuilder()
          .setTitle("🎯 Feature Status")
          .setColor(0x00ae86)
          .addFields(
            {
              name: "Enabled Features",
              value:
                enabledFeatures.length > 0
                  ? enabledFeatures.join("\n")
                  : "None",
              inline: true,
            },
            {
              name: "Disabled Features",
              value:
                disabledFeatures.length > 0
                  ? disabledFeatures.join("\n")
                  : "None",
              inline: true,
            }
          )
          .setTimestamp();
        break;

      case "apis":
        const apis = config.apis;
        const configuredAPIs = Object.entries(apis).map(([name, apiConfig]) => {
          const hasKey = apiConfig.key ? "✅" : "❌";
          return `${hasKey} ${name.charAt(0).toUpperCase() + name.slice(1)}`;
        });

        embed = new EmbedBuilder()
          .setTitle("🌐 API Configuration")
          .setColor(0x00ae86)
          .addFields({
            name: "API Services",
            value: configuredAPIs.join("\n"),
            inline: false,
          })
          .setFooter({ text: "✅ = Configured, ❌ = Not configured" })
          .setTimestamp();
        break;
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
