const TelegramBot = require("node-telegram-bot-api");
const config = require("./config");
const QRCode = require("qrcode");
const logger = require("./utils/logger");
const { getWeatherForecast } = require("./requests/forecast");
const CurrencyConverter = require("./utils/currency-converter");

const TELEGRAM_BOT_TOKEN =
  config.bot.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Start command with interactive menu
bot.onText(/\/start/, (msg) => {
  logger.info(`Telegram user ${msg.from.username} started the bot`);

  const welcomeText = `🤖 *Welcome to Discord/Telegram Assistant!*

Choose what you'd like to do:`;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🌤️ Weather Info", callback_data: "weather_menu" },
          { text: "📱 QR Code", callback_data: "qr_menu" },
        ],
        [
          { text: "💱 Currency Rates", callback_data: "currency_menu" },
          { text: "🏓 Ping Bot", callback_data: "ping" },
        ],
        [{ text: "❓ Help", callback_data: "help" }],
      ],
    },
  };

  bot.sendMessage(msg.chat.id, welcomeText, {
    parse_mode: "Markdown",
    ...keyboard,
  });
});

// Weather command implementation
bot.onText(/\/weather (.+)/, async (msg, match) => {
  const location = match[1];
  const chatId = msg.chat.id;

  try {
    logger.info(
      `Telegram weather request for: ${location} by ${msg.from.username}`
    );

    // Send "typing" action
    bot.sendChatAction(chatId, "typing");

    const forecast = await getWeatherForecast(location);

    const response =
      `🌤️ *Weather in ${forecast.location.city}, ${forecast.location.country}*\n\n` +
      `🌡️ *Temperature:* ${forecast.current.temperature}°C\n` +
      `☁️ *Condition:* ${forecast.current.condition}\n` +
      `💧 *Humidity:* ${forecast.current.humidity}%\n` +
      `💨 *Wind Speed:* ${forecast.current.windSpeed} km/h\n` +
      `🕐 *Local Time:* ${forecast.location.localTime}`;

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  } catch (error) {
    logger.error(`Telegram weather error: ${error.message}`);
    bot.sendMessage(
      chatId,
      "❌ Sorry, I couldn't get weather information for that location."
    );
  }
});
// QR Code command
bot.onText(/\/qr (.+)/, async (msg, match) => {
  const text = match[1];
  const chatId = msg.chat.id;

  try {
    logger.info(`Telegram QR request for: ${text} by ${msg.from.username}`);

    // Send "typing" action
    bot.sendChatAction(chatId, "typing");

    // Generate QR code as buffer
    const qrBuffer = await QRCode.toBuffer(text, {
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Send as photo
    bot.sendPhoto(chatId, qrBuffer, {
      caption: `🔗 QR Code for: "${text}"`,
    });
  } catch (error) {
    logger.error(`Telegram QR error: ${error.message}`);
    bot.sendMessage(chatId, "❌ Failed to generate QR code");
  }
});

// Currency command implementation
bot.onText(/\/currency (.*)/, async (msg, match) => {
  const input = match[1].trim().toUpperCase();
  const chatId = msg.chat.id;

  try {
    logger.info(
      `Telegram currency request for: ${input} by ${msg.from.username}`
    );

    bot.sendChatAction(chatId, "typing");

    const converter = new CurrencyConverter();
    let conversions;
    let message;

    if (!input || input === "") {
      // Show major currencies
      const majorCurrencies = ["USD", "EUR", "GBP", "AED", "CAD", "AUD"];
      conversions = await converter.getExchangeRates(majorCurrencies, 1);
      message = "💱 *Major Currency Exchange Rates to IRR*\n\n";
    } else if (converter.supportedCurrencies.includes(input)) {
      conversions = await converter.getExchangeRates([input], 1);
      const currencyName = converter.getCurrencyName(input);
      message = `💱 *${converter.getCurrencyFlag(
        input
      )} ${input} (${currencyName}) to IRR*\n\n`;
    } else {
      bot.sendMessage(
        chatId,
        `❌ Currency "${input}" is not supported.\n\n📋 *Supported currencies:*\n${converter.supportedCurrencies.join(
          ", "
        )}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Format the message
    Object.entries(conversions).forEach(([currencyCode, data]) => {
      const flag = converter.getCurrencyFlag(currencyCode);
      const name = converter.getCurrencyName(currencyCode);
      const rate = data.rate.toLocaleString("en-US", {
        maximumFractionDigits: 2,
      });

      message += `${flag} *${currencyCode}* (${name})\n`;
      message += `💰 1 ${currencyCode} = *${rate} IRR*\n\n`;
    });

    message += `📅 *Updated:* ${new Date().toLocaleDateString("fa-IR")}\n`;
    message += `⏰ *Time:* ${new Date().toLocaleTimeString("fa-IR")}\n`;
    message += `📡 *Source:* currencylayer.com`;

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  } catch (error) {
    logger.error(`Telegram currency error: ${error.message}`);
    bot.sendMessage(
      chatId,
      "❌ Sorry, couldn't fetch currency rates. Please try again later."
    );
  }
});

// Handle button clicks
bot.on("callback_query", async (callbackQuery) => {
  const message = callbackQuery.message;
  const data = callbackQuery.data;
  const chatId = message.chat.id;

  // Answer the callback query to remove loading state
  bot.answerCallbackQuery(callbackQuery.id);

  switch (data) {
    case "weather_menu":
      bot.sendMessage(
        chatId,
        "🌤️ *Weather Information*\n\nPlease send me a city name to get weather info.\n\nExample: London",
        {
          parse_mode: "Markdown",
        }
      );
      break;

    case "qr_menu":
      bot.sendMessage(
        chatId,
        "📱 *QR Code Generator*\n\nPlease send me the text or URL you want to convert to QR code.\n\nExample: https://google.com",
        {
          parse_mode: "Markdown",
        }
      );
      break;

    case "currency_menu":
      const currencyKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "💵 USD to IRR", callback_data: "currency:USD" },
              { text: "💶 EUR to IRR", callback_data: "currency:EUR" },
            ],
            [
              { text: "💷 GBP to IRR", callback_data: "currency:GBP" },
              { text: "💴 AED to IRR", callback_data: "currency:AED" },
            ],
            [
              {
                text: "📊 All Major Currencies",
                callback_data: "currency:ALL",
              },
            ],
            [{ text: "🔙 Back to Menu", callback_data: "back_to_menu" }],
          ],
        },
      };

      bot.sendMessage(
        chatId,
        "💱 *Currency Exchange Rates*\n\nSelect a currency to see its value in Iranian Rials:",
        {
          parse_mode: "Markdown",
          ...currencyKeyboard,
        }
      );
      break;

    case "ping":
      bot.sendMessage(chatId, "🏓 Pong! Bot is alive and running perfectly!");
      break;

    case "help":
      showHelpMenu(chatId);
      break;

    case "back_to_menu":
      // Show main menu again by triggering start command
      const startMsg = {
        chat: { id: chatId },
        from: callbackQuery.from,
        text: "/start",
      };
      bot.emit("message", startMsg);
      break;

    default:
      // Handle dynamic callbacks
      if (data.startsWith("qr_generate:")) {
        const text = data.replace("qr_generate:", "");
        try {
          bot.sendChatAction(chatId, "upload_photo");
          const qrBuffer = await QRCode.toBuffer(text, {
            width: 300,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          bot.sendPhoto(chatId, qrBuffer, {
            caption: `📱 QR Code for: "${text}"`,
          });
        } catch (error) {
          bot.sendMessage(chatId, "❌ Failed to generate QR code");
        }
      }

      if (data.startsWith("weather_check:")) {
        const location = data.replace("weather_check:", "");
        try {
          bot.sendChatAction(chatId, "typing");
          const forecast = await getWeatherForecast(location);
          const response = `🌤️ *Weather in ${forecast.location.city}, ${forecast.location.country}*\n\n🌡️ *Temperature:* ${forecast.current.temperature}°C\n☁️ *Condition:* ${forecast.current.condition}\n💧 *Humidity:* ${forecast.current.humidity}%`;
          bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
        } catch (error) {
          bot.sendMessage(
            chatId,
            `❌ Sorry, couldn't get weather for "${location}"`
          );
        }
      }

      if (data.startsWith("currency:")) {
        const currency = data.replace("currency:", "");
        try {
          bot.sendChatAction(chatId, "typing");

          const converter = new CurrencyConverter();
          let conversions;
          let message;

          if (currency === "ALL") {
            // Show major currencies
            const majorCurrencies = ["USD", "EUR", "GBP", "AED", "CAD", "AUD"];
            conversions = await converter.getExchangeRates(majorCurrencies, 1);
            message = "💱 *Major Currency Exchange Rates to IRR*\n\n";
          } else {
            conversions = await converter.getExchangeRates([currency], 1);
            const currencyName = converter.getCurrencyName(currency);
            message = `💱 *${converter.getCurrencyFlag(
              currency
            )} ${currency} (${currencyName}) to IRR*\n\n`;
          }

          // Format the message
          Object.entries(conversions).forEach(([currencyCode, data]) => {
            const flag = converter.getCurrencyFlag(currencyCode);
            const name = converter.getCurrencyName(currencyCode);
            const rate = data.rate.toLocaleString("en-US", {
              maximumFractionDigits: 2,
            });

            message += `${flag} *${currencyCode}* (${name})\n`;
            message += `💰 1 ${currencyCode} = *${rate} IRR*\n\n`;
          });

          message += `📅 *Updated:* ${new Date().toLocaleDateString(
            "fa-IR"
          )}\n`;
          message += `⏰ *Time:* ${new Date().toLocaleTimeString("fa-IR")}\n`;
          message += `📡 *Source:* currencylayer.com`;

          bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        } catch (error) {
          logger.error(`Telegram currency error: ${error.message}`);
          bot.sendMessage(
            chatId,
            "❌ Sorry, couldn't fetch currency rates. Please try again later."
          );
        }
      }

      break;
  }
});

// Help menu function
function showHelpMenu(chatId) {
  const helpText = `📚 *Bot Features & Commands:*

🌤️ *Weather Information*
• Get current weather for any city
• Shows temperature, humidity, wind speed
• Usage: Click Weather button or type city name

📱 *QR Code Generator*  
• Convert text/URLs to QR codes
• High quality image output
• Usage: Click QR button or send text

� *Currency Exchange*
• Live exchange rates to Iranian Rial (IRR)
• Support for major world currencies
• Updated every 24 hours
• Usage: Click Currency button or use /currency command

�🔧 *Bot Commands*
• /start - Show main menu
• /help - Show this help
• /menu - Return to main menu
• /ping - Check bot status
• /weather <city> - Get weather directly
• /qr <text> - Generate QR code directly
• /currency [code] - Get exchange rates

💡 *Tips:*
• Use buttons for easy navigation
• Send plain text for quick actions
• All features work instantly`;

  const backButton = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔙 Back to Menu", callback_data: "back_to_menu" }],
      ],
    },
  };

  bot.sendMessage(chatId, helpText, {
    parse_mode: "Markdown",
    ...backButton,
  });
}

// Menu command to show main menu anytime
bot.onText(/\/menu/, (msg) => {
  // Reuse the start command logic
  const startMsg = { ...msg, text: "/start" };
  bot.emit("message", startMsg);
});

// Help command (simple version)
bot.onText(/\/help/, (msg) => {
  showHelpMenu(msg.chat.id);
});

// Smart message handler for non-command text
bot.on("message", async (msg) => {
  // Skip if it's a command or doesn't have text
  if (!msg.text || msg.text.startsWith("/")) return;

  const text = msg.text.trim();
  const chatId = msg.chat.id;

  // Auto-detect what user wants based on input
  if (text.length > 0) {
    // If it looks like a URL or contains common QR text patterns
    if (
      text.includes("http") ||
      text.includes(".com") ||
      text.includes("www") ||
      text.length < 100
    ) {
      // Check if it might be a city name (simple check)
      const cityPattern = /^[a-zA-Z\s]{2,50}$/;
      const isLikelyCity = cityPattern.test(text) && !text.includes(".");

      const buttons = [];

      // Add QR option for most text
      buttons.push({
        text: "📱 Generate QR Code",
        callback_data: `qr_generate:${text}`,
      });

      // Add weather option if it looks like a city
      if (isLikelyCity) {
        buttons.push({
          text: "🌤️ Check Weather",
          callback_data: `weather_check:${text}`,
        });
      }

      const keyboard = {
        reply_markup: {
          inline_keyboard: [buttons],
        },
      };

      bot.sendMessage(
        chatId,
        `I received: "${text}"\n\nWhat would you like to do?`,
        keyboard
      );
    } else {
      // For longer text, just offer QR code
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📱 Generate QR Code",
                callback_data: `qr_generate:${text}`,
              },
            ],
          ],
        },
      };
      bot.sendMessage(
        chatId,
        `Would you like to generate a QR code for this text?`,
        keyboard
      );
    }
  }
});

// Ping command
bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id, "🏓 Pong! Bot is alive and running.");
});

// Error handling
bot.on("error", (error) => {
  logger.error("Telegram bot error:", error);
});

// Polling error handling
bot.on("polling_error", (error) => {
  logger.error("Telegram polling error:", error);
});

logger.info("🚀 Telegram bot started successfully!");
