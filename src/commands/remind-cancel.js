const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../utils/logger");
const ReminderSystem = require("../utils/reminder-system");

// Create a single instance of reminder system
const reminderSystem = new ReminderSystem();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remind-cancel")
    .setDescription("Cancel one of your reminders")
    .addIntegerOption((option) =>
      option
        .setName("id")
        .setDescription("The ID of the reminder to cancel (from /reminders)")
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    try {
      const reminderId = interaction.options.getInteger("id");
      const userId = interaction.user.id;

      // Try to cancel the reminder
      const success = reminderSystem.cancelReminder(reminderId, userId);

      if (success) {
        const embed = new EmbedBuilder()
          .setColor("#00ff00")
          .setTitle("✅ Reminder Cancelled")
          .setDescription(`Successfully cancelled reminder #${reminderId}`)
          .addFields({
            name: "💡 Tip",
            value: "Use `/reminders` to view your remaining active reminders.",
          })
          .setTimestamp();

        await interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });

        logger.info(`Reminder ${reminderId} cancelled by user ${userId}`);
      } else {
        const embed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Reminder Not Found")
          .setDescription(
            `Could not find reminder #${reminderId} or you don't have permission to cancel it.`
          )
          .addFields({
            name: "💡 Check Your Reminders",
            value:
              "Use `/reminders` to see all your active reminders and their IDs.",
          })
          .setTimestamp();

        await interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      }
    } catch (error) {
      logger.error("Error in remind-cancel command:", error);

      await interaction.reply({
        content:
          "❌ An error occurred while cancelling your reminder. Please try again.",
        ephemeral: true,
      });
    }
  },
};
