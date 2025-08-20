const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../utils/logger");
const ReminderSystem = require("../utils/reminder-system");

// Create a single instance of reminder system
const reminderSystem = new ReminderSystem();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reminders")
    .setDescription("View all your active reminders"),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;
      const userReminders = reminderSystem.getUserReminders(userId);

      if (userReminders.length === 0) {
        const embed = new EmbedBuilder()
          .setColor("#ffa500")
          .setTitle("📝 Your Reminders")
          .setDescription("You don't have any active reminders.")
          .addFields({
            name: "💡 Create a Reminder",
            value:
              "Use `/remind <time> <message>` to set a new reminder!\n\nExample: `/remind 30m Buy groceries`",
          })
          .setTimestamp();

        await interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`📝 Your Active Reminders (${userReminders.length})`)
        .setTimestamp()
        .setFooter({
          text: "Use /remind-cancel <id> to cancel a reminder",
        });

      // Add each reminder as a field (limit to 10 for readability)
      const displayReminders = userReminders.slice(0, 10);

      for (const reminder of displayReminders) {
        const timeUntil = reminderSystem.getTimeUntilString(
          reminder.reminderTime
        );
        const formattedTime = reminderSystem.formatReminderTime(
          reminder.reminderTime
        );

        embed.addFields({
          name: `⏰ #${reminder.id} - ${reminder.message.substring(0, 50)}${
            reminder.message.length > 50 ? "..." : ""
          }`,
          value: `**When:** ${formattedTime}\n**In:** ${timeUntil}`,
          inline: false,
        });
      }

      if (userReminders.length > 10) {
        embed.setDescription(
          `Showing first 10 of ${userReminders.length} reminders.`
        );
      }

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });

      logger.info(
        `Reminders viewed by user ${userId}: ${userReminders.length} active`
      );
    } catch (error) {
      logger.error("Error in reminders command:", error);

      await interaction.reply({
        content:
          "❌ An error occurred while fetching your reminders. Please try again.",
        ephemeral: true,
      });
    }
  },
};
