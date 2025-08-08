const { SlashCommandBuilder } = require("discord.js");
const { getWeatherForecast } = require("../requests/forecast");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("forecast")
    .setDescription("Get weather forecast for a location")
    .addStringOption((option) =>
      option
        .setName("location")
        .setDescription("Enter a location")
        .setRequired(true)
    ),
  async execute(interaction) {
    const location = interaction.options.getString("location");

    // Defer the reply since weather API might take a moment
    await interaction.deferReply();

    try {
      const forecast = await getWeatherForecast(location);

      // Create a formatted response
      const response =
        `🌤️ **Weather in ${forecast.location.city}, ${forecast.location.country}**\n\n` +
        `🌡️ **Current Temperature:** ${forecast.current.temperature}°C\n` +
        `☁️ **Condition:** ${forecast.current.condition}\n` +
        `💧 **Humidity:** ${forecast.current.humidity}%\n` +
        `💨 **Wind Speed:** ${forecast.current.windSpeed} km/h\n` +
        `🕐 **Local Time:** ${forecast.location.localTime}`;

      await interaction.editReply(response);
    } catch (error) {
      console.error("Weather command error:", error);
      await interaction.editReply(
        `❌ Error fetching weather forecast: ${error.message}`
      );
    }
  },
};
