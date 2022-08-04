# Katonei BOT

Telegram 隨機色圖 Bot（也可以不色）

- `/start` 關於 Bot
- `/hentai` 隨機色圖
- `/addpixiv PixivId` 從Pixiv添加圖片
- `/addpixiv PixivId1 PixivId2 PixivId3 ...` 從Pixiv添加多個圖片
- `/addphoto` 從Telegram添加圖片
- `/getphoto filename` 獲取圖片檔案
- `/status` Bot狀態
- `/addadmin` 添加管理員（回復訊息）
- `/deladmin` 刪除管理員（回復訊息）

### API

#### GET/POST `/api/hentai`

type = pixiv
```json
{
    "_id": "624d9d3fc203bc0473113e9d",
    "id": 88534867,
    "name": "ティッシュちゃんと海デート",
    "author": "かるたも",
    "taglist": [
        "オリジナル",
        "水着",
        "かるたも",
        "ティッシュちゃん",
        "おっぱい",
        "おなか",
        "ショートパンツ",
        "おへそ",
        "美巨乳",
        "オリジナル10000users入り"
    ],
    "type": "pixiv",
    "file": "88534867.webp"
}
```
type = other
```json
{
    "_id": "xxxxxxxxxxxxxxx",
    "type": "other",
    "file": "xxxxxxx.webp"
}
```

GET `/api/hentai_img` 302 To ImageFile (Webp)

GET `/photos/{filename}` (Webp)

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
    "api_server": false,            // API Enable
    "api_port": 80,                 // API Http Port
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