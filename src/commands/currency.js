const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const CurrencyConverter = require("../utils/currency-converter");
const logger = require("../utils/logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("currency")
    .setDescription("Get live exchange rates converted to Iranian Rials")
    .addStringOption((option) =>
      option
        .setName("currency")
        .setDescription("Currency code (e.g., USD, EUR, GBP)")
        .setRequired(false)
    )
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount to convert (default: 1)")
        .setRequired(false)
        .setMinValue(0.01)
        .setMaxValue(1000000)
    ),

  async execute(interaction) {
    const currency = interaction.options.getString("currency")?.toUpperCase();
    const amount = interaction.options.getNumber("amount") || 1;

    try {
      await interaction.deferReply();

      const converter = new CurrencyConverter();

      logger.info(
        `Currency request: ${currency || "ALL"} amount: ${amount} by ${
          interaction.user.tag
        }`
      );

      let conversions;
      let title;

      if (currency) {
        // Validate currency code
        if (!converter.supportedCurrencies.includes(currency)) {
          const embed = new EmbedBuilder()
            .setColor("#ff6b6b")
            .setTitle("❌ Invalid Currency")
            .setDescription(`Currency code "${currency}" is not supported.`)
            .addFields({
              name: "📋 Supported Currencies",
              value: converter.supportedCurrencies.join(", "),
              inline: false,
            })
            .setTimestamp();

          return await interaction.editReply({ embeds: [embed] });
        }

        conversions = await converter.getExchangeRates([currency], amount);
        title = `💱 ${amount} ${currency} to Iranian Rial`;
      } else {
        conversions = await converter.getExchangeRates(
          converter.supportedCurrencies.slice(0, 8), // Limit for embed
          amount
        );
        title = `💱 Exchange Rates to Iranian Rial`;
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setColor("#00d2ff")
        .setTitle(title)
        .setDescription(
          `💰 **Amount:** ${amount} unit${
            amount !== 1 ? "s" : ""
          } of each currency`
        )
        .setTimestamp()
        .setFooter({
          text: "💡 Professional API with real-time rates • Data from currencylayer.com",
          iconURL: interaction.client.user.displayAvatarURL(),
        });

      // Add currency fields
      Object.entries(conversions).forEach(([currencyCode, data]) => {
        const flag = converter.getCurrencyFlag(currencyCode);
        const name = converter.getCurrencyName(currencyCode);

        embed.addFields({
          name: `${flag} ${currencyCode} - ${name}`,
          value: `**${data.formatted}**\n*Rate: ${data.rate.toLocaleString(
            "en-US",
            { maximumFractionDigits: 2 }
          )}*`,
          inline: true,
        });
      });

      await interaction.editReply({ embeds: [embed] });

      logger.info(`✅ Currency command completed for ${interaction.user.tag}`);
    } catch (error) {
      logger.error(`Currency command error: ${error.message}`);

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff6b6b")
        .setTitle("❌ Currency Service Error")
        .setDescription(
          "Failed to fetch exchange rates. Please try again later."
        )
        .addFields({
          name: "🔧 Possible Solutions",
          value:
            "• Check your internet connection\n• Try again in a few minutes\n• Contact support if the issue persists",
          inline: false,
        })
        .setTimestamp();

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};
