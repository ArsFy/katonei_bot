# Katonei BOT

Telegram 隨機色圖 Bot（也可以不色）

-----

### 環境

- Node V14+
- Mongo DB
- imageMagick

### Clone

> 需要先安裝 imageMagick 和 MongoDB

```
git clone https://github.com/ArsFy/katonei_bot.git
cd katonei_bot
npm i
```

### Config

> 重新命名 `config.example.json` 為 `config.json`

```js
{
    "db_server": "127.0.0.1:27017", // MongoDB Server
    "db_name": "database",          // Database name
    "db_user": "username",          // Database Username
    "db_pass": "123456",            // Database Password
    "cookie": "",                   // Pixiv Cookie (enable R18)
    "bot_token": "123456:Abcdefghijklmn",   // Telegram Bot Token
    "bot": "@xxxx_bot",                     // Telegram Name
    "admin": []                             // Telegram Admin ID (Number)
}
```

### Start

```
node main.js
```