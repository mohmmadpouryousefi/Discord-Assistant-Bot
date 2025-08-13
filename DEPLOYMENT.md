# Discord Bot Deployment Guide

## 🚀 Deploying to Railway (FREE)

### Prerequisites
- GitHub account
- Your bot code pushed to GitHub
- Railway account (free)

### Step 1: Prepare Your Project

1. **Create Procfile** (tells Railway how to start your bot)
```
web: npm start
```

2. **Update package.json** (ensure start script works)
```json
{
  "scripts": {
    "start": "node src/index.js"
  }
}
```

3. **Environment Variables Setup**
- Copy your .env variables
- You'll add them to Railway dashboard

### Step 2: Deploy to Railway

1. **Sign up at Railway.app**
   - Use GitHub account for easy setup

2. **Create New Project**
   - Click "Deploy from GitHub repo"
   - Select your Discord-Bot repository

3. **Configure Environment Variables**
   - Go to Variables tab
   - Add all your .env variables:
     - DISCORD_BOT_TOKEN
     - TELEGRAM_BOT_TOKEN
     - WEATHER_API_KEY
     - CLIENT_ID
     - GUILD_ID

4. **Deploy**
   - Railway auto-detects Node.js
   - Automatically installs dependencies
   - Starts your bot

### Step 3: Monitor Your Bot

- Check logs in Railway dashboard
- Monitor usage in Railway metrics
- Bot will restart automatically if it crashes

### Alternative: Render Deployment

1. **Sign up at Render.com**
2. **Connect GitHub repository**
3. **Configure as Web Service**
4. **Add environment variables**
5. **Deploy**

## 🔧 Additional Optimizations

### Keep-Alive System (for free tiers)
Some free hosting services sleep after 30 minutes of inactivity. Add this to prevent sleeping:

```javascript
// keep-alive.js
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is alive!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Keep-alive server running on port ${PORT}`);
});
```

### Health Check Endpoint
```javascript
// Add to your main bot file
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.listen(process.env.PORT || 3000);
```

## 💰 Cost Comparison

| Service | Free Tier | Paid | Best For |
|---------|-----------|------|----------|
| Railway | 500 hrs/month | $5/month | Small bots |
| Render | 750 hrs/month | $7/month | Growing projects |
| Heroku | No free tier | $7/month | Established bots |
| DigitalOcean | No free tier | $5/month | Full control |
| VPS | No free tier | $5-20/month | Multiple projects |

## ⚡ Quick Start Commands

```bash
# Prepare for deployment
git add .
git commit -m "Prepare for Railway deployment"
git push origin main

# Add Procfile
echo "web: npm start" > Procfile

# Update package.json if needed
npm run build  # if using TypeScript
```
