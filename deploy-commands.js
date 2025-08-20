require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const config = require("./src/config");
const logger = require("./src/utils/logger");

const commands = [];

// Load all command files
const commandsPath = path.join(__dirname, "src", "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded command: ${command.data.name}`);
  } else {
    console.log(
      `⚠️  [WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.bot.token);

// Deploy commands
(async () => {
  try {
    console.log(
      `🚀 Started refreshing ${commands.length} application (/) commands.`
    );

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationCommands(config.bot.clientId),
      { body: commands }
    );

    console.log(
      `✅ Successfully reloaded ${data.length} application (/) commands.`
    );

    // Log all deployed commands
    console.log("\n📋 Deployed commands:");
    data.forEach((cmd) => {
      console.log(`   • /${cmd.name} - ${cmd.description}`);
    });
  } catch (error) {
    console.error("❌ Error deploying commands:", error);
  }
})();
