require("dotenv").config();

const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");

const { clientReadyHandler } = require("./events/clientReady");
const pingCommand = require("./commands/ping");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

client.commands.set(pingCommand.data.name, pingCommand);

client.on(Events.ClientReady, clientReadyHandler);

// Handle slash command interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
