# Katonei BOT

Telegram 隨機色圖 Bot（也可以不色）

- `/start` 關於 Bot
- `/hentai tag (可選，如不限定TAG就是全隨機)` 隨機色圖
- `/addpixiv PixivId` 從Pixiv添加圖片
- `/addpixivlist PixivId1 PixivId2 PixivId3 ...` 從Pixiv添加多個圖片
- `/addphoto` 從Telegram添加圖片
- `/getphoto filename` 獲取圖片檔案
- `/status` Bot狀態
- `/addadmin` 添加管理員（回復訊息）
- `/deladmin` 刪除管理員（回復訊息）

----

## 目錄
1. [部署教學](#部署教學)
2. [API 使用教學](#api)
3. [一些可能會用到的問題](#一些可能會用到的問題)
----
## <span id="部署教學">部署</span>
### 1. 安裝必要環境
#### 1. Node V16+ (https://nodejs.org)
#### 2. Mongo DB (https://www.mongodb.com)

如果使用 Debian 11 部署本專案可以使用 `/script/mongodb.sh`，其他發行版或 windows 詳見官網

#### 3. imageMagick (https://imagemagick.org)

如果使用 Debian 部署本專案可以使用 `/script/imagemagick.sh`，其他發行版或 windows 詳見官網

#### 4. Pixiv Headless (可選)

這是一個用於獲取Pixiv限制級内容/解決風控的組件，如果無限制級内容的需求可以不使用。

請參考 README 部署它：https://github.com/ArsFy/pixiv-headless

### 2. 克隆 repo 并安裝依賴庫

```
git clone https://github.com/ArsFy/katonei_bot.git
cd katonei_bot
npm i
```

### 3. 配置檔案

> 重新命名 `config.example.json` 為 `config.json`

```js
{
    "api_server": false,            // API Enable
    "api_port": 80,                 // API Http Port
    "db_server": "127.0.0.1:27017", // MongoDB Server
    "db_name": "database",          // Database name
    "db_user": "username",          // Database Username
    "db_pass": "123456",            // Database Password
    "bot_token": "123456:Abcdefghijklmn",   // Telegram Bot Token
    "bot": "@xxxx_bot",                     // Telegram Name
    "admin": [],                            // Telegram Admin ID (Number)
    "pixiv-headless": "no",                 // Pixiv Headless URL
    "pixiv-headless-token": ""              // Pixiv Headless Token
}
```

- `api_server` & `api_port`: 啓用 API 后將會開放一個 HTTP API 用於隨機圖片的外部請求

- `admin` (Telegram Admin ID) 應該是你的 TG User ID (可以透過 [@getmyid_bot](https://t.me/getmyid_bot) 獲取)，應使用 Array 類型，支援多個 ID 設定多個 Admin

- `pixiv-headless`: Pixiv Headless 的 API URL，它看起來應該是 `http://x.x.x.x:8082`

- `pixiv-headless-token`: Pixiv Headless 的 API Token，請保持和伺服器配置相同

### 4. 開始

```
node main.js
```

-----

## <span id="api">API</span>

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

## <span id="一些可能會用到的問題">一些可能會用到的問題</span>

1. Q: 如何正常獲取 Pixiv R18/G 圖片<br>
   A: 使用 Headless 登入實現模擬正常請求獲取，這裏可以使用一個已經實現的專案 [ArsFy/pixiv-headless](https://github.com/ArsFy/pixiv-headless)，可以在 config 中配置它（如果沒有配置它將會無法獲取 R18/G 圖片）