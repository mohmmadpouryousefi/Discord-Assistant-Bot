const { REST, Routes } = require("discord.js");
const config = require("../config");
const logger = require("../utils/logger");

const rest = new REST({ version: "10" }).setToken(config.bot.token);

async function clientReadyHandler(client) {
  logger.info(`Ready! Logged in as ${client.user.tag}`);

  try {
    logger.info(
      `Started refreshing application ${client.commands.size} commands.`
    );
    const data = await rest.put(
      Routes.applicationGuildCommands(config.bot.clientId, config.bot.guildId),
      {
        body: client.commands.map((command) => command.data.toJSON()),
      }
    );
    logger.info(`Successfully reloaded ${data.length} application commands.`);
  } catch (error) {
    logger.error("Error reloading application commands:", error);
  }
}

module.exports = { clientReadyHandler };
