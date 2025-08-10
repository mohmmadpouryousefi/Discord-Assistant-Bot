const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const QRCode = require("qrcode");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("qr")
    .setDescription("Generate a QR code from the provided text or url")
    .addStringOption((Option) =>
      Option.setName("text")
        .setDescription("The text or URL to encode in the QR code")
        .setRequired(true)
    ),

  async execute(interaction) {
    const text = interaction.options.getString("text");
    try {
      // Generate QR code as a buffer
      const qrBuffer = await QRCode.toBuffer(text, { type: "png" });
      const attachment = new AttachmentBuilder(qrBuffer, {
        name: "qrcode.png",
      });
      await interaction.reply({
        content: "Here is your QR code:",
        files: [attachment],
      });
    } catch (error) {
      await interaction.reply({
        content: "❌ Failed to generate QR code.",
        ephemeral: true,
      });
    }
  },
};
