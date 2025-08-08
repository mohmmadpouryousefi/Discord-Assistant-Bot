const { REST, Routes } = require("discord.js");
require("dotenv").config();

const { getWeatherForecast } = require("../requests/forecast");

const rest = new REST({ version: "10" }).setToken(
  process.env.DISCORD_BOT_TOKEN
);

async function clientReadyHandler(client) {
  console.log(`Ready! Logged in as ${client.user.tag}`);

  try {
    console.log(
      `Started refreshing application ${client.commands.size} commands.`
    );
    const data = await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      {
        body: client.commands.map((command) => command.data.toJSON()),
      }
    );
    console.log(`Successfully reloaded ${data.length} application commands.`);
  } catch (error) {
    console.error(error);
  }
}

module.exports = { clientReadyHandler };
