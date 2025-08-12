import dotenv from "dotenv";
import config from "./config";
import logger from "./utils/logger";

import { Client, Collection, Events, GatewayIntentBits, SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import fs from "node:fs";
import path from "node:path";

import { clientReadyHandler } from "./events/clientReady";

// Configure environment variables
dotenv.config();

// Extend the Client type to include commands
declare module "discord.js" {
  export interface Client {
    commands: Collection<string, Command>;
  }
}

// Define command interface
interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Create a collection to store commands
client.commands = new Collection<string, Command>();

// Load all commands dynamically from the commands folder
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js") || file.endsWith(".ts"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  
  // Dynamic import for both .js and .ts files
  let command: Command;
  
  if (file.endsWith(".ts")) {
    // For TypeScript files, we'll need to compile them first
    command = require(filePath);
  } else {
    // For JavaScript files
    command = require(filePath);
  }

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
logger.info("Bot Configuration:", (config as any).getConfigSummary());

// Start Telegram bot if enabled
if (config.features.telegramIntegration && config.bot.telegramToken) {
  require("./telegram");
  logger.info("🚀 Telegram bot integration enabled");
} else {
  logger.warn("⚠️ Telegram bot disabled or token missing");
}

client.once(Events.ClientReady, clientReadyHandler);

// Handle slash command interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    logger.error(`❌ No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
    logger.info(`✅ Command ${interaction.commandName} executed successfully by ${interaction.user.tag}`);
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

// Handle unhandled promise rejections
process.on("unhandledRejection", (error: Error) => {
  logger.error("Unhandled promise rejection:", error);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught exception:", error);
  process.exit(1);
});

// Login to Discord
client.login(config.bot.token).catch((error: Error) => {
  logger.error("Failed to login to Discord:", error);
  process.exit(1);
});

logger.info("🚀 Discord bot is starting up...");

export default client;
