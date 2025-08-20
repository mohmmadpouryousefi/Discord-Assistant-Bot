require("dotenv").config();
const config = require("./config");
const logger = require("./utils/logger");
const KeepAliveServer = require("./utils/keep-alive");
const ReminderSystem = require("./utils/reminder-system");

const {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
} = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const { clientReadyHandler } = require("./events/clientReady");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Initialize Reminder System
const reminderSystem = new ReminderSystem();

// Set up reminder callback to send notifications
reminderSystem.setReminderCallback(async (reminder) => {
  try {
    if (reminder.platform === "discord" && reminder.channelId) {
      const channel = await client.channels.fetch(reminder.channelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor("#ffff00")
          .setTitle("⏰ Reminder!")
          .setDescription(reminder.message)
          .addFields(
            {
              name: "📅 Set",
              value: reminderSystem.formatReminderTime(reminder.createdAt),
              inline: true,
            },
            {
              name: "🆔 ID",
              value: `#${reminder.id}`,
              inline: true,
            }
          )
          .setFooter({ text: "This reminder has been completed" })
          .setTimestamp();

        await channel.send({
          content: `<@${reminder.userId}>`,
          embeds: [embed],
        });

        logger.info(`Reminder notification sent for reminder ${reminder.id}`);
      }
    }
  } catch (error) {
    logger.error(`Error sending reminder notification: ${error.message}`);
  }
});

// Export reminder system for use in commands
module.exports.reminderSystem = reminderSystem;

// Create a collection to store commands
client.commands = new Collection();

// Load all commands dynamically from the commands folder
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    logger.info(`✅ Loaded command: ${command.data.name}`);
  } else {
    logger.warn(
      `⚠️  [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

// Log configuration summary
logger.info("Bot Configuration:", config.getConfigSummary());

// Start Telegram bot if enabled
if (config.features.enableTelegram && config.bot.telegramToken) {
  require("./telegram");
  logger.info("🚀 Telegram bot integration enabled");
} else {
  logger.warn("⚠️ Telegram bot disabled or token missing");
}

client.once(Events.ClientReady, clientReadyHandler);

// Handle slash command interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    logger.error(
      `❌ No command matching ${interaction.commandName} was found.`
    );
    return;
  }

  try {
    logger.info(
      `🔄 Executing command: ${interaction.commandName} by ${interaction.user.tag}`
    );
    await command.execute(interaction);
    logger.info(`✅ Successfully executed: ${interaction.commandName}`);
  } catch (error) {
    logger.error(`❌ Error executing ${interaction.commandName}:`, error);

    const errorMessage = {
      content: "There was an error while executing this command!",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Start keep-alive server for deployment
const keepAliveServer = new KeepAliveServer();
keepAliveServer.start();

// Handle process termination gracefully
process.on("SIGINT", () => {
  logger.info("👋 Received SIGINT. Gracefully shutting down...");
  keepAliveServer.stop();
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("👋 Received SIGTERM. Gracefully shutting down...");
  keepAliveServer.stop();
  client.destroy();
  process.exit(0);
});

client.login(config.bot.token);
