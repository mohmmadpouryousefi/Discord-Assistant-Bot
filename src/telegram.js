const TelegramBot = require("node-telegram-bot-api");
const config = require("./config");
const QRCode = require("qrcode");
const logger = require("./utils/logger");
const { getWeatherForecast } = require("./requests/forecast");
const CurrencyConverter = require("./utils/currency-converter");
const CityAutocomplete = require("./utils/city-autocomplete");

const TELEGRAM_BOT_TOKEN =
  config.bot.telegramToken || process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Initialize city autocomplete
const cityAutocomplete = new CityAutocomplete();

// Get reminder system from main bot
let reminderSystem;
setTimeout(() => {
  reminderSystem = require('./index').reminderSystem;
  if (reminderSystem) {
    // Set up Telegram reminder callback
    const originalCallback = reminderSystem.onReminderTrigger;
    reminderSystem.setReminderCallback(async (reminder) => {
      // Handle Discord reminders
      if (originalCallback) {
        await originalCallback(reminder);
      }
      
      // Handle Telegram reminders
      if (reminder.platform === 'telegram' && reminder.channelId) {
        try {
          const message = `⏰ *Reminder!*\n\n${reminder.message}\n\n🕐 *Set:* ${reminderSystem.formatReminderTime(reminder.createdAt)}\n🆔 *ID:* #${reminder.id}`;
          
          await bot.sendMessage(reminder.channelId, message, {
            parse_mode: 'Markdown',
            ...createBackButton()
          });
          
          logger.info(`Telegram reminder notification sent for reminder ${reminder.id}`);
        } catch (error) {
          logger.error(`Error sending Telegram reminder: ${error.message}`);
        }
      }
    });
  }
}, 1000); // Wait for main bot to initialize

// Helper function to create back button
function createBackButton() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔙 بازگشت به منو", callback_data: "back_to_menu" }],
      ],
    },
  };
}

// Helper function to show main menu
function showMainMenu(chatId) {
  const welcomeText = `🤖 *به دستیار تلگرام خوش آمدید!*

لطفاً انتخاب کنید که چه کاری می‌خواهید انجام دهید:`;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🌤️ اطلاعات آب و هوا", callback_data: "weather_menu" },
          { text: "📱 QR Code", callback_data: "qr_menu" },
        ],
        [
          { text: "💱 نرخ ارز", callback_data: "currency_menu" },
          { text: "⏰ یادآوری", callback_data: "reminder_menu" },
        ],
        [
          { text: "🏓 پینگ بات", callback_data: "ping" },
          { text: "❓ راهنما", callback_data: "help" },
        ],
      ],
    },
  };

  bot.sendMessage(chatId, welcomeText, {
    parse_mode: "Markdown",
    ...keyboard,
  });
}

// Start command with interactive menu
bot.onText(/\/start/, (msg) => {
  logger.info(`Telegram user ${msg.from.username} started the bot`);
  showMainMenu(msg.chat.id);
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
      `🌤️ *وضع اب و هوا در ${forecast.location.city}, ${forecast.location.country}*\n\n` +
      `🌡️ *دمای هوا:* ${forecast.current.temperature}°C\n` +
      `☁️ *وضعیت:* ${forecast.current.condition}\n` +
      `💧 *رطوبت:* ${forecast.current.humidity}%\n` +
      `💨 *سرعت باد:* ${forecast.current.windSpeed} km/h\n` +
      `🕐 *زمان محلی:* ${forecast.location.localTime}`;

    bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
  } catch (error) {
    logger.error(`Telegram weather error: ${error.message}`);
    bot.sendMessage(
      chatId,
      "❌ متأسفم، نتونستم اطلاعات آب و هوای این مکان رو بگیرم.."
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

// Reminder command for Telegram
bot.onText(/\/remind (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const input = match[1].trim();
  
  if (!reminderSystem) {
    bot.sendMessage(chatId, "❌ سیستم یادآوری در حال حاضر در دسترس نیست");
    return;
  }

  // Parse input: first word is time, rest is message
  const parts = input.split(' ');
  if (parts.length < 2) {
    bot.sendMessage(
      chatId,
      "❌ فرمت نادرست!\n\nاستفاده: `/remind <زمان> <پیام>`\n\nمثال: `/remind 30m خرید نان`",
      { parse_mode: "Markdown" }
    );
    return;
  }

  const timeString = parts[0];
  const message = parts.slice(1).join(' ');

  try {
    bot.sendChatAction(chatId, "typing");

    const result = reminderSystem.createReminder(
      chatId.toString(),
      message,
      timeString,
      'telegram',
      chatId
    );

    if (result.success) {
      const responseMessage = `✅ *یادآوری تنظیم شد!*\n\n💬 *پیام:* ${message}\n🕐 *زمان:* ${reminderSystem.formatReminderTime(result.reminder.reminderTime)}\n⏳ *در:* ${result.timeUntil}\n🆔 *شناسه:* #${result.reminder.id}\n\n💡 برای مشاهده همه یادآوری‌ها: \`/reminders\`\n💡 برای لغو: \`/cancel ${result.reminder.id}\``;

      bot.sendMessage(chatId, responseMessage, {
        parse_mode: "Markdown",
        ...createBackButton()
      });

      logger.info(`Telegram reminder created: ${result.reminder.id} for chat ${chatId}`);
    } else {
      bot.sendMessage(
        chatId,
        `❌ ${result.error}\n\n💡 *فرمت‌های معتبر:*\n• \`5m\`, \`30m\` - دقیقه\n• \`2h\`, \`3h\` - ساعت\n• \`1d\`, \`2d\` - روز\n• \`tomorrow\` - فردا\n• \`5pm\`, \`14:30\` - ساعت مشخص`,
        { parse_mode: "Markdown" }
      );
    }
  } catch (error) {
    logger.error(`Telegram reminder error: ${error.message}`);
    bot.sendMessage(chatId, "❌ خطا در تنظیم یادآوری. لطفاً دوباره تلاش کنید.");
  }
});

// View reminders command for Telegram
bot.onText(/\/reminders/, (msg) => {
  const chatId = msg.chat.id;
  
  if (!reminderSystem) {
    bot.sendMessage(chatId, "❌ سیستم یادآوری در دسترس نیست");
    return;
  }

  const userReminders = reminderSystem.getUserReminders(chatId.toString());
  
  if (userReminders.length === 0) {
    bot.sendMessage(
      chatId,
      "📝 *یادآوری‌های شما*\n\nشما هیچ یادآوری فعالی ندارید.\n\n💡 برای ایجاد یادآوری: `/remind <زمان> <پیام>`",
      { parse_mode: "Markdown" }
    );
  } else {
    let message = `📝 *یادآوری‌های فعال شما (${userReminders.length}):*\n\n`;
    
    userReminders.slice(0, 10).forEach(reminder => {
      const timeUntil = reminderSystem.getTimeUntilString(reminder.reminderTime);
      const formattedTime = reminderSystem.formatReminderTime(reminder.reminderTime);
      
      message += `⏰ *#${reminder.id}* - ${reminder.message}\n`;
      message += `📅 ${formattedTime}\n`;
      message += `⏳ ${timeUntil}\n\n`;
    });

    if (userReminders.length > 10) {
      message += `... و ${userReminders.length - 10} یادآوری دیگر\n\n`;
    }

    message += `💡 برای لغو یادآوری: \`/cancel <شناسه>\``;

    bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
});

// Cancel reminder command for Telegram
bot.onText(/\/cancel (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const reminderId = parseInt(match[1]);
  
  if (!reminderSystem) {
    bot.sendMessage(chatId, "❌ سیستم یادآوری در دسترس نیست");
    return;
  }

  const success = reminderSystem.cancelReminder(reminderId, chatId.toString());
  
  if (success) {
    bot.sendMessage(
      chatId,
      `✅ یادآوری #${reminderId} با موفقیت لغو شد.\n\n💡 برای مشاهده یادآوری‌های باقی‌مانده: \`/reminders\``,
      { parse_mode: "Markdown" }
    );
    logger.info(`Telegram reminder ${reminderId} cancelled by chat ${chatId}`);
  } else {
    bot.sendMessage(
      chatId,
      `❌ یادآوری #${reminderId} پیدا نشد یا متعلق به شما نیست.\n\n💡 برای مشاهده یادآوری‌هایتان: \`/reminders\``,
      { parse_mode: "Markdown" }
    );
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
      // Show popular cities with search option
      const popularCities = cityAutocomplete
        .getCitiesByRegion("iran")
        .slice(0, 4);
      const worldCities = [
        { name: "London", country: "UK" },
        { name: "Paris", country: "France" },
        { name: "Dubai", country: "UAE" },
        { name: "New York", country: "USA" },
      ];

      const weatherButtons = [];

      // Add Iranian cities
      if (popularCities.length >= 2) {
        weatherButtons.push([
          {
            text: `🇮🇷 ${popularCities[0].name}`,
            callback_data: `weather_check:${popularCities[0].name}`,
          },
          {
            text: `🇮🇷 ${popularCities[1].name}`,
            callback_data: `weather_check:${popularCities[1].name}`,
          },
        ]);
      }

      if (popularCities.length >= 4) {
        weatherButtons.push([
          {
            text: `🇮🇷 ${popularCities[2].name}`,
            callback_data: `weather_check:${popularCities[2].name}`,
          },
          {
            text: `🇮🇷 ${popularCities[3].name}`,
            callback_data: `weather_check:${popularCities[3].name}`,
          },
        ]);
      }

      // Add world cities
      weatherButtons.push([
        {
          text: `🇬🇧 ${worldCities[0].name}`,
          callback_data: `weather_check:${worldCities[0].name}`,
        },
        {
          text: `🇫🇷 ${worldCities[1].name}`,
          callback_data: `weather_check:${worldCities[1].name}`,
        },
      ]);

      weatherButtons.push([
        {
          text: `🇦🇪 ${worldCities[2].name}`,
          callback_data: `weather_check:${worldCities[2].name}`,
        },
        {
          text: `🇺🇸 ${worldCities[3].name}`,
          callback_data: `weather_check:${worldCities[3].name}`,
        },
      ]);

      // Add search option
      weatherButtons.push([
        { text: "🔍 جستجوی شهر", callback_data: "weather_search" },
      ]);

      // Add back button
      weatherButtons.push([
        { text: "🔙 بازگشت به منو", callback_data: "back_to_menu" },
      ]);

      const weatherKeyboard = {
        reply_markup: {
          inline_keyboard: weatherButtons,
        },
      };

      bot.sendMessage(
        chatId,
        "🌤️ *اطلاعات آب و هوا*\n\nشهر مورد نظر خود را انتخاب کنید یا نام شهر را تایپ کنید:\n\n💡 *نکته:* برای جستجو، کافی است چند حرف اول نام شهر را بنویسید",
        {
          parse_mode: "Markdown",
          ...weatherKeyboard,
        }
      );
      break;

    case "qr_menu":
      bot.sendMessage(
        chatId,
        "📱 *تولید کد QR*\n\nلطفاً متن یا URL مورد نظر خود را برای تبدیل به کد QR ارسال کنید.\n\nمثال: https://google.com",
        {
          parse_mode: "Markdown",
          ...createBackButton(),
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
                text: "📊 همه ارزهای اصلی",
                callback_data: "currency:ALL",
              },
            ],
            [{ text: "🔙 بازگشت به منو", callback_data: "back_to_menu" }],
          ],
        },
      };

      bot.sendMessage(
        chatId,
        "💱 *نرخ ارز*\n\nلطفاً یک ارز را برای مشاهده ارزش آن به ریال ایران انتخاب کنید:",
        {
          parse_mode: "Markdown",
          ...currencyKeyboard,
        }
      );
      break;

    case "reminder_menu":
      const reminderButtons = [
        [
          { text: "➕ یادآوری جدید", callback_data: "reminder_new" },
          { text: "📝 یادآوری‌های من", callback_data: "reminder_list" }
        ],
        [{ text: "🔙 بازگشت به منو", callback_data: "back_to_menu" }]
      ];

      bot.sendMessage(
        chatId,
        "⏰ *سیستم یادآوری*\n\nبا این سیستم می‌توانید یادآوری‌های شخصی تنظیم کنید.\n\n💡 *مثال‌ها:*\n• `30m خرید نان`\n• `2h تماس با پزشک`\n• `tomorrow جلسه کاری`\n• `5pm مصرف دارو`",
        {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: reminderButtons }
        }
      );
      break;

    case "reminder_new":
      bot.sendMessage(
        chatId,
        "➕ *یادآوری جدید*\n\nلطفاً یادآوری خود را به این فرمت ارسال کنید:\n\n`/remind <زمان> <پیام>`\n\n🕐 *فرمت‌های زمان:*\n• `5m`, `30m` - دقیقه\n• `2h`, `3h` - ساعت  \n• `1d`, `2d` - روز\n• `tomorrow` - فردا\n• `5pm`, `14:30` - ساعت مشخص\n\n💡 *مثال:*\n`/remind 30m خرید نان`\n`/remind 2h تماس با دکتر`\n`/remind tomorrow جلسه مهم`",
        {
          parse_mode: "Markdown",
          ...createBackButton()
        }
      );
      break;

    case "reminder_list":
      if (!reminderSystem) {
        bot.sendMessage(chatId, "❌ سیستم یادآوری در حال حاضر در دسترس نیست", createBackButton());
        break;
      }

      const userReminders = reminderSystem.getUserReminders(chatId.toString());
      
      if (userReminders.length === 0) {
        bot.sendMessage(
          chatId,
          "📝 *یادآوری‌های شما*\n\nشما هیچ یادآوری فعالی ندارید.\n\n💡 برای ایجاد یادآوری جدید از دستور `/remind` استفاده کنید.",
          {
            parse_mode: "Markdown",
            ...createBackButton()
          }
        );
      } else {
        let message = `📝 *یادآوری‌های فعال شما (${userReminders.length}):*\n\n`;
        
        userReminders.slice(0, 10).forEach((reminder, index) => {
          const timeUntil = reminderSystem.getTimeUntilString(reminder.reminderTime);
          const formattedTime = reminderSystem.formatReminderTime(reminder.reminderTime);
          
          message += `⏰ *#${reminder.id}* - ${reminder.message}\n`;
          message += `📅 ${formattedTime}\n`;
          message += `⏳ ${timeUntil}\n\n`;
        });

        if (userReminders.length > 10) {
          message += `... و ${userReminders.length - 10} یادآوری دیگر`;
        }

        message += `\n💡 برای لغو یادآوری: \`/cancel <شناسه>\``;

        bot.sendMessage(chatId, message, {
          parse_mode: "Markdown",
          ...createBackButton()
        });
      }
      break;

    case "ping":
      bot.sendMessage(chatId, "🏓 تست، بات فعال است.", createBackButton());
      break;

    case "weather_search":
      bot.sendMessage(
        chatId,
        "🔍 *جستجوی شهر*\n\nلطفاً نام شهر یا چند حرف اول آن را تایپ کنید:\n\nمثال: `vi` برای Vienna\nمثال: `teh` برای Tehran\nمثال: `lon` برای London",
        {
          parse_mode: "Markdown",
          ...createBackButton(),
        }
      );
      break;

    case "help":
      showHelpMenu(chatId);
      break;

    case "back_to_menu":
      showMainMenu(chatId);
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
            caption: `📱 QR Code برای: "${text}"`,
          });
        } catch (error) {
          bot.sendMessage(chatId, "❌ نتونستم کد QR رو تولید کنم");
        }
      }

      if (data.startsWith("weather_check:")) {
        const location = data.replace("weather_check:", "");
        try {
          bot.sendChatAction(chatId, "typing");
          const forecast = await getWeatherForecast(location);
          const response = `🌤️ *وضع آب و هوا در ${forecast.location.city}, ${forecast.location.country}*\n\n🌡️ *دمای هوا:* ${forecast.current.temperature}°C\n☁️ *وضعیت:* ${forecast.current.condition}\n💧 *رطوبت:* ${forecast.current.humidity}%\n💨 *سرعت باد:* ${forecast.current.windSpeed} km/h\n🕐 *زمان محلی:* ${forecast.location.localTime}`;

          bot.sendMessage(chatId, response, {
            parse_mode: "Markdown",
            ...createBackButton(),
          });
        } catch (error) {
          bot.sendMessage(
            chatId,
            `❌ متأسفم، نتونستم اطلاعات آب و هوای "${location}" رو بگیرم`,
            createBackButton()
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

          message += `📅 *بروزرسانی:* ${new Date().toLocaleDateString(
            "fa-IR"
          )}\n`;
          message += `⏰ *زمان:* ${new Date().toLocaleTimeString("fa-IR")}\n`;
          message += `📡 *منبع:* currencylayer.com`;

          bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
        } catch (error) {
          logger.error(`خطای ارز تلگرام: ${error.message}`);
          bot.sendMessage(
            chatId,
            "❌ متأسفم، نتونستم نرخ‌های ارز رو بگیرم. لطفاً بعداً امتحان کنید."
          );
        }
      }

      break;
  }
});

// Help menu function
function showHelpMenu(chatId) {
  const helpText = `📚 ویژگی‌های بات و دستورات:

🌤️ *اطلاعات آب و هوا*
• دریافت وضعیت کنونی آب و هوا برای هر شهر
• جستجوی هوشمند شهرها با تایپ چند حرف
• نحوه استفاده: دکمه آب و هوا یا تایپ نام شهر

📱 *تولید کننده کد QR*
• تبدیل متن/URL به کد QR با کیفیت بالا
• نحوه استفاده: دکمه QR یا ارسال متن

💱 *تبدیل ارز*
• نرخ‌های زنده تبدیل به ریال ایران (IRR)
• پشتیبانی از ارزهای اصلی جهان
• به‌روزرسانی هر ۲۴ ساعت

⏰ *سیستم یادآوری*
• تنظیم یادآوری‌های شخصی با زمان‌بندی انعطاف‌پذیر
• پشتیبانی از فرمت‌های مختلف زمان
• مدیریت و لغو یادآوری‌ها

🔧 *دستورات بات*
• /start - نمایش منوی اصلی
• /help - نمایش این راهنما
• /menu - بازگشت به منوی اصلی
• /ping - بررسی وضعیت بات

🌤️ *دستورات آب و هوا*
• /weather <شهر> - آب و هوای مستقیم
• تایپ نام شهر - پیشنهادات هوشمند

📱 *دستورات QR*
• /qr <متن> - تولید QR مستقیم
• ارسال متن - پیشنهاد تولید QR

💱 *دستورات ارز*
• /currency [کد] - نرخ‌های تبدیل

⏰ *دستورات یادآوری*
• /remind <زمان> <پیام> - یادآوری جدید
• /reminders - مشاهده یادآوری‌ها
• /cancel <شناسه> - لغو یادآوری

💡 *نکات:*
• از دکمه‌ها برای ناوبری آسان استفاده کنید
• تمام ویژگی‌ها به‌طور آنی کار می‌کنند
• یادآوری‌ها در هر دو پلتفرم فعال هستند`;

  bot.sendMessage(chatId, helpText, {
    parse_mode: "Markdown",
    ...createBackButton(),
  });
}

// Menu command to show main menu anytime
bot.onText(/\/menu/, (msg) => {
  showMainMenu(msg.chat.id);
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
    // Check if it might be a city search (2-50 characters, mostly letters)
    const cityPattern = /^[a-zA-Z\s]{2,50}$/;
    const isLikelyCity = cityPattern.test(text) && !text.includes(".");

    if (isLikelyCity && text.length >= 2) {
      // Get city suggestions
      const suggestions = cityAutocomplete.findSuggestions(text, 6);

      if (suggestions.length > 0) {
        const suggestionKeyboard =
          cityAutocomplete.createSuggestionKeyboard(suggestions);

        bot.sendMessage(
          chatId,
          `🔍 *پیشنهادات شهر برای "${text}":*\n\nشهر مورد نظر خود را انتخاب کنید:`,
          {
            parse_mode: "Markdown",
            ...suggestionKeyboard,
          }
        );
        return;
      } else {
        // No suggestions found, try direct weather search
        try {
          bot.sendChatAction(chatId, "typing");
          const forecast = await getWeatherForecast(text);
          const response = `🌤️ *وضع آب و هوا در ${forecast.location.city}, ${forecast.location.country}*\n\n🌡️ *دمای هوا:* ${forecast.current.temperature}°C\n☁️ *وضعیت:* ${forecast.current.condition}\n💧 *رطوبت:* ${forecast.current.humidity}%\n💨 *سرعت باد:* ${forecast.current.windSpeed} km/h\n🕐 *زمان محلی:* ${forecast.location.localTime}`;

          bot.sendMessage(chatId, response, {
            parse_mode: "Markdown",
            ...createBackButton(),
          });
          return;
        } catch (error) {
          // City not found, show search suggestions
          bot.sendMessage(
            chatId,
            `❌ شهر "${text}" پیدا نشد.\n\n💡 *پیشنهاد:* چند حرف اول نام شهر را تایپ کنید تا پیشنهادات را ببینید.\n\nمثال: \`vi\` برای Vienna، \`teh\` برای Tehran`,
            {
              parse_mode: "Markdown",
              ...createBackButton(),
            }
          );
          return;
        }
      }
    }

    // Handle other types of input (URLs, long text, etc.)
    if (
      text.includes("http") ||
      text.includes(".com") ||
      text.includes("www") ||
      text.length < 100
    ) {
      const buttons = [];

      // Add QR option for most text
      buttons.push({
        text: "📱 تولید کد QR",
        callback_data: `qr_generate:${text}`,
      });

      // Add weather option if it looks like a city
      if (isLikelyCity) {
        buttons.push({
          text: "🌤️ وضعیت آب و هوا",
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
        `من اطلاعات: "${text}"\n\nچه کاری می‌خواهید انجام دهید؟`,
        keyboard
      );
    } else {
      // For longer text, just offer QR code
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📱 تولید کد QR",
                callback_data: `qr_generate:${text}`,
              },
            ],
          ],
        },
      };
      bot.sendMessage(
        chatId,
        `آیا می‌خواهید برای این متن یک کد QR تولید کنید؟`,
        keyboard
      );
    }
  }
});
// Ping command
bot.onText(/\/ping/, (msg) => {
  bot.sendMessage(msg.chat.id, "🏓 بات در حال کار است.");
});
// Error handling
bot.on("error", (error) => {
  logger.error("خطای بات تلگرام:", error);
});
// Polling error handling
bot.on("polling_error", (error) => {
  logger.error("خطای نظرسنجی:", error);
});

logger.info("🚀 بات تلگرام با موفقیت راه‌اندازی شد!");
