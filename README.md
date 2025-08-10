# 🤖 Discord Assistant Bot

<div align="center">

![Discord Assistant Bot](https://img.shields.io/badge/Discord-Assistant%20Bot-7289DA?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)

**A professional multi-platform assistant bot with advanced features and enterprise-grade architecture**

[Features](#-features) • [Quick Start](#-quick-start) • [Commands](#-commands) • [Configuration](#-configuration) • [Contributing](#-contributing)

</div>

---

## 📋 Overview

Discord Assistant Bot is a sophisticated, multi-platform chatbot that operates seamlessly across Discord and Telegram platforms. Built with modern Node.js architecture, it features enterprise-grade logging, centralized configuration management, and an extensible command system.

### ✨ Key Highlights

- 🎮 **Dual Platform Support** - Works on both Discord and Telegram
- 🌤️ **Real-time Weather Data** - Powered by WeatherAPI.com
- 📱 **QR Code Generation** - Create QR codes instantly
- 🔧 **Professional Logging** - Winston-based logging system
- ⚙️ **Centralized Configuration** - Environment-based config management
- 🎛️ **Interactive Menus** - Button-based UI for Telegram users
- 🔒 **Enterprise Ready** - Production-grade error handling and validation

---

## 🚀 Features

### 🎮 Discord Features
- **Slash Commands** - Modern Discord command interface
- **Weather Forecasts** - Get detailed weather information for any city
- **QR Code Generator** - Convert text/URLs to QR codes with attachments
- **Bot Configuration** - Display current bot settings and status
- **User Information** - Detailed user profile and server statistics
- **Server Information** - Comprehensive server details and statistics

### 📱 Telegram Features  
- **Interactive Menu System** - Beautiful button-based navigation
- **Smart Message Detection** - Auto-suggests actions based on input
- **Weather Information** - Real-time weather data with rich formatting
- **QR Code Generation** - Instant QR code creation from any text
- **Multi-step Workflows** - Guided user interactions
- **Professional Responses** - Markdown-formatted messages with emojis

### 🏗️ Technical Features
- **Professional Logging** - File rotation, multiple log levels, structured logging
- **Configuration Management** - Environment variables, feature flags, validation
- **Error Handling** - Comprehensive error catching and user-friendly messages
- **Modular Architecture** - Easily extensible command and feature system
- **Development Tools** - Hot reload with nodemon, detailed documentation

---

## 🛠️ Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime Environment | v23.9.0+ |
| **Discord.js** | Discord API Library | v14.21.0 |
| **node-telegram-bot-api** | Telegram Bot API | Latest |
| **Winston** | Professional Logging | Latest |
| **qrcode** | QR Code Generation | Latest |
| **dotenv** | Environment Management | Latest |

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18.0.0 or higher
- Discord Bot Token ([Create here](https://discord.com/developers/applications))
- Telegram Bot Token ([Create with @BotFather](https://core.telegram.org/bots#6-botfather))
- WeatherAPI Key ([Get free key](https://www.weatherapi.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mohmmadpouryousefi/Discord-Assistant-Bot.git
   cd Discord-Assistant-Bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file**
   ```env
   # Required - Bot Configuration
   DISCORD_BOT_TOKEN=your_discord_bot_token
   CLIENT_ID=your_discord_client_id
   GUILD_ID=your_discord_guild_id
   
   # Required - API Keys
   WEATHER_API_KEY=your_weather_api_key
   
   # Optional - Telegram Integration
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   ENABLE_TELEGRAM=true
   
   # Optional - Logging Configuration
   LOG_LEVEL=info
   ENABLE_FILE_LOGGING=true
   ENABLE_CONSOLE_LOGGING=true
   ```

5. **Start the bot**
   ```bash
   # Development (with hot reload)
   npm run dev
   
   # Production
   npm start
   ```

---

## 📖 Commands

### 🎮 Discord Commands

| Command | Description | Usage |
|---------|-------------|--------|
| `/weather <city>` | Get weather information | `/weather London` |
| `/qr <text>` | Generate QR code | `/qr https://example.com` |
| `/config` | Show bot configuration | `/config` |
| `/user [user]` | Display user information | `/user @username` |
| `/server` | Show server information | `/server` |
| `/ping` | Check bot response time | `/ping` |

### 📱 Telegram Commands

| Command | Description | Usage |
|---------|-------------|--------|
| `/start` | Show interactive menu | `/start` |
| `/weather <city>` | Get weather information | `/weather Paris` |
| `/qr <text>` | Generate QR code | `/qr Hello World` |
| `/help` | Show detailed help | `/help` |
| `/menu` | Return to main menu | `/menu` |
| `/ping` | Check bot status | `/ping` |

### 🎛️ Interactive Features (Telegram)
- **Button Navigation** - Click buttons instead of typing commands
- **Smart Suggestions** - Send text to get action suggestions
- **Context-Aware** - Bot detects cities, URLs, and suggests appropriate actions

---

## ⚙️ Configuration

### Environment Variables

#### 🔑 Required Settings
```env
DISCORD_BOT_TOKEN=          # Your Discord bot token
CLIENT_ID=                  # Discord application client ID  
GUILD_ID=                   # Discord server ID for slash commands
WEATHER_API_KEY=            # WeatherAPI.com API key
```

#### 🔧 Optional Settings
```env
# Telegram Integration
TELEGRAM_BOT_TOKEN=         # Your Telegram bot token
ENABLE_TELEGRAM=true        # Enable/disable Telegram features

# Logging Configuration  
LOG_LEVEL=info              # Log level (error, warn, info, debug)
ENABLE_FILE_LOGGING=true    # Enable file logging
ENABLE_CONSOLE_LOGGING=true # Enable console logging
LOG_MAX_FILE_SIZE=5242880   # Max log file size (5MB)
LOG_MAX_FILES=5             # Number of log files to keep

# API Configuration
WEATHER_API_URL=https://api.weatherapi.com/v1
WEATHER_API_TIMEOUT=5000    # API timeout in milliseconds

# Feature Flags
ENABLE_WEATHER=true         # Enable weather features
ENABLE_MUSIC=false          # Enable music features (future)
ENABLE_MODERATION=false     # Enable moderation features (future)
```

### 📁 Project Structure
```
Discord-Assistant-Bot/
├── src/
│   ├── commands/           # Discord slash commands
│   │   ├── config.js      # Bot configuration display
│   │   ├── forecast.js    # Weather command
│   │   ├── ping.js        # Ping command
│   │   ├── qr.js          # QR code generator
│   │   ├── server.js      # Server information
│   │   └── user.js        # User information
│   ├── config/
│   │   └── index.js       # Centralized configuration
│   ├── events/
│   │   └── clientReady.js # Bot ready event handler
│   ├── requests/
│   │   └── forecast.js    # Weather API requests
│   ├── utils/
│   │   └── logger.js      # Winston logging setup
│   ├── index.js           # Main bot entry point
│   └── telegram.js        # Telegram bot implementation
├── .env                   # Environment variables
├── .env.example          # Environment template
├── package.json          # Dependencies and scripts
├── ROADMAP.md            # Development roadmap
└── README.md             # This file
```

---

## 🔧 Development

### Available Scripts
```bash
# Start bot (production)
npm start

# Start with hot reload (development)  
npm run dev

# Check for outdated packages
npm outdated

# Update dependencies
npm update
```

### 📝 Adding New Features

1. **Discord Commands**: Add to `src/commands/`
2. **Telegram Features**: Extend `src/telegram.js`
3. **Configuration**: Update `src/config/index.js`
4. **Logging**: Use the centralized logger from `src/utils/logger.js`

### 🐛 Debugging
- Check logs in the console or log files
- Use `LOG_LEVEL=debug` for detailed debugging
- Monitor API rate limits and responses

---

## 📚 API Integration

### 🌤️ Weather API
- **Provider**: [WeatherAPI.com](https://www.weatherapi.com/)
- **Features**: Current weather, forecasts, location data
- **Rate Limit**: 1 million calls/month (free tier)

### 🤖 Bot APIs
- **Discord**: Official Discord.js v14 library
- **Telegram**: Official Bot API via node-telegram-bot-api

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### 🔧 Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit: `git commit -m 'feat: add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

### 📋 Contribution Guidelines
- Follow the existing code style
- Add proper logging to new features
- Update documentation for new commands
- Test on both Discord and Telegram platforms
- Use meaningful commit messages

### 🐛 Reporting Issues
- Use the GitHub issue tracker
- Include detailed reproduction steps
- Provide environment information
- Add relevant logs (remove sensitive data)

---

## 🗺️ Roadmap

Check out our [ROADMAP.md](ROADMAP.md) for planned features and improvements:

### 🎯 Upcoming Features
- 🎵 Music streaming integration
- 🔍 Web scraping capabilities  
- 📊 Analytics and usage statistics
- 🎮 Interactive games and entertainment
- 🔔 Custom notification systems
- 🌍 Multi-language support

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Discord.js** - Excellent Discord API library
- **WeatherAPI.com** - Reliable weather data service
- **Winston** - Professional logging solution
- **Node.js** - Powerful JavaScript runtime
- **Telegram Bot API** - Comprehensive bot platform

---

## 📞 Support

### 🆘 Getting Help
- 📖 Check the documentation first
- 🐛 Search existing issues on GitHub
- 💬 Join our Discord community: [Invite Link](#)
- 📧 Contact: [your-email@example.com](mailto:your-email@example.com)

### 🔗 Links
- **GitHub Repository**: [Discord-Assistant-Bot](https://github.com/mohmmadpouryousefi/Discord-Assistant-Bot)
- **Documentation**: [Wiki](https://github.com/mohmmadpouryousefi/Discord-Assistant-Bot/wiki)
- **Issues**: [Bug Reports & Feature Requests](https://github.com/mohmmadpouryousefi/Discord-Assistant-Bot/issues)

---

<div align="center">

**⭐ Star this repository if you found it helpful!**

Made with ❤️ by [Mohammad Pour Yousefi](https://github.com/mohmmadpouryousefi)

![GitHub stars](https://img.shields.io/github/stars/mohmmadpouryousefi/Discord-Assistant-Bot?style=social)
![GitHub forks](https://img.shields.io/github/forks/mohmmadpouryousefi/Discord-Assistant-Bot?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/mohmmadpouryousefi/Discord-Assistant-Bot?style=social)

</div>
