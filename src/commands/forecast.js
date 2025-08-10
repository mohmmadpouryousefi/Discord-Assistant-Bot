const { SlashCommandBuilder } = require("discord.js");
const { getWeatherForecast } = require("../requests/forecast");
const logger = require("../utils/logger");

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

      // Debug: Log the forecast structure
      logger.info(
        "Forecast data structure:",
        JSON.stringify(forecast, null, 2)
      );

      // Check if forecast data exists
      if (!forecast || !forecast.location || !forecast.current) {
        await interaction.editReply(
          "❌ Invalid weather data received. Please try again."
        );
        return;
      }

      // Create basic response first
      let response =
        `🌤️ **Weather in ${forecast.location.city}, ${forecast.location.country}**\n\n` +
        `🌡️ **Current Temperature:** ${forecast.current.temperature}°C\n` +
        `☁️ **Condition:** ${forecast.current.condition}\n` +
        `💧 **Humidity:** ${forecast.current.humidity}%\n` +
        `💨 **Wind Speed:** ${forecast.current.windSpeed} km/h\n` +
        `🕐 **Local Time:** ${forecast.location.localTime}`;

      // Add forecast data only if it exists
      if (forecast.forecast && Array.isArray(forecast.forecast)) {
        const forecastDays = forecast.forecast
          .map(
            (day) =>
              `${day.date}: ${day.day.condition.text} (${day.day.maxtemp_c}°C/${day.day.mintemp_c}°C)`
          )
          .join("\n");

        response += `\n\n📊 **3-Day Outlook:**\n${forecastDays}`;
      }

      await interaction.editReply(response);
    } catch (error) {
      logger.error("Weather command error:", error);
      await interaction.editReply(
        `❌ Error fetching weather forecast: ${error.message}`
      );
    }
  },
};
