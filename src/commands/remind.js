const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const logger = require("../utils/logger");
const ReminderSystem = require("../utils/reminder-system");

// Create a single instance of reminder system
const reminderSystem = new ReminderSystem();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remind")
    .setDescription("Set a personal reminder")
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription(
          'When to remind you (e.g., "5m", "2h", "tomorrow", "5pm")'
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("What to remind you about")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const timeString = interaction.options.getString("time");
      const message = interaction.options.getString("message");
      const userId = interaction.user.id;
      const channelId = interaction.channelId;

      // Create the reminder
      const result = reminderSystem.createReminder(
        userId,
        message,
        timeString,
        "discord",
        channelId
      );

      if (result.success) {
        const embed = new EmbedBuilder()
          .setColor("#00ff00")
          .setTitle("⏰ Reminder Set!")
          .setDescription(`I'll remind you about: **${message}**`)
          .addFields(
            {
              name: "🕐 When",
              value: reminderSystem.formatReminderTime(
                result.reminder.reminderTime
              ),
              inline: true,
            },
            {
              name: "⏳ In",
              value: result.timeUntil,
              inline: true,
            },
            {
              name: "🆔 Reminder ID",
              value: `#${result.reminder.id}`,
              inline: true,
            }
          )
          .setFooter({
            text: "Use /reminders to view all your reminders or /remind-cancel to cancel one",
          })
          .setTimestamp();

        await interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });

        logger.info(
          `Reminder created via Discord: ${result.reminder.id} for user ${userId}`
        );
      } else {
        const embed = new EmbedBuilder()
          .setColor("#ff0000")
          .setTitle("❌ Invalid Time Format")
          .setDescription(result.error)
          .addFields({
            name: "💡 Valid Time Formats",
            value: [
              "**Relative:** `5m`, `2h`, `3d`, `1w`",
              "**Specific:** `5pm`, `14:30`, `9am`",
              "**Phrases:** `tomorrow`, `tonight`, `next week`",
              "**Examples:**",
              "• `/remind 30m Buy groceries`",
              "• `/remind 2h Call mom`",
              "• `/remind tomorrow Meeting with team`",
              "• `/remind 5pm Take medication`",
            ].join("\n"),
          });

        await interaction.reply({
          embeds: [embed],
          ephemeral: true,
        });
      }
    } catch (error) {
      logger.error("Error in remind command:", error);

      await interaction.reply({
        content:
          "❌ An error occurred while setting your reminder. Please try again.",
        ephemeral: true,
      });
    }
  },
};
