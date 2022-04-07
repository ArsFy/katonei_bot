process.env.NTBA_FIX_319 = 1;
const config = require('./config.json');
const { getPixiv } = require('./getPixiv');
const { getTg } = require('./getTg');
const MongoPool = require("./dbPool");
const fs = require("fs");
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.bot_token, { polling: true });

let time = {}

const isAdmin = (id) => {
    return config.admin.indexOf(id) != -1 ? true : false
}

MongoPool.initPool()

bot.on("polling_error", console.log);

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    let msgInfo = msg.text != undefined ? msg.text.split(" ") : "";

    const sendPic = async (file, msg, mid, s) => {
        if (mid != undefined) {
            bot.editMessageCaption(msg, {
                "chat_id": chatId,
                "message_id": mid
            })
        } else {
            if (time[even.chat.id] == undefined ? 0 : time[even.chat.id] < new Date() - 5000) {
                time[even.chat.id] = new Date() / 1
                try {
                    let msginfo = await bot.sendPhoto(chatId, fs.readFileSync(`./photos/${file}`), {
                        caption: msg,
                        "reply_markup": {
                            "inline_keyboard": s ? [
                                [{ "text": "我還要！", "callback_data": "get" }]
                            ] : []
                        }
                    })
                    return msginfo.message_id
                } catch (err) {
                    bot.sendMessage(chatId, "沒有這個檔案: " + file)
                }
            } else {
                bot.sendMessage(chatId, "太快啦...等待幾秒後再試吧！")
            }
        }
    }

    switch (msgInfo[0]) {
        case "/hentai": case `/hentai${config.bot}`: case "/sex": case `/sex${config.bot}`:
            MongoPool.getInstance(async (client) => {
                let db = client.db(config.db_name)
                db.collection(config.db_name).aggregate([{ $sample: { size: 1 } }]).toArray((err, result) => {
                    switch (result[0].type) {
                        case "pixiv":
                            sendPic(result[0].file, `@${msg.from.username} 作品名: ${result[0].name}\n作者: ${result[0].author}\nTag: #${result[0].taglist.join(" #")}\nPixivID: ${result[0].id}\nURL: https://pixiv.net/i/${result[0].id}`, undefined, true);
                            break
                        case "other":
                            sendPic(result[0].file, `其他來源（未記錄）`, undefined, true);
                            break
                    }
                })
            });
            break;
        case "/addpixiv": case `/addpixiv${config.bot}`:
            if (isAdmin(msg.from.id)) {
                if (msgInfo.length > 1 ? !isNaN(Number(msgInfo[1])) : false) {
                    let mid = await bot.sendMessage(chatId, `@${msg.from.username} 載入中... 目標: Pixiv ID ${msgInfo[1]}`);
                    MongoPool.getInstance(async (client) => {
                        let db = client.db(config.db_name)
                        try {
                            let jsoninfo = await getPixiv(Number(msgInfo[1]))
                            db.collection(config.db_name).insertOne(jsoninfo)
                            bot.editMessageText(`@${msg.from.username} 任務完成`, {
                                "chat_id": chatId,
                                "message_id": mid.message_id
                            })
                            sendPic(jsoninfo.file, `作品名: ${jsoninfo.name}\n作者: ${jsoninfo.author}\nTag: #${jsoninfo.taglist.join(" #")}\nPixivID: ${jsoninfo.id}\nURL: https://pixiv.net/i/${jsoninfo.id}`)
                        } catch (e) {
                            console.log(e)
                            bot.editMessageText(`@${msg.from.username} 載入圖像時發生錯誤！目標可能不存在或伺服器故障`, {
                                "chat_id": chatId,
                                "message_id": mid.message_id
                            })
                        }
                    });
                } else {
                    bot.sendMessage(chatId, `@${msg.from.username} 傳入值錯誤！\n/add_pixiv PixivID(Number)`);
                }
            } else {
                bot.sendMessage(chatId, `@${msg.from.username} 你不是管理員哦！不能使用這條命令`);
            }
            break
        case "/addphoto": case `/addphoto${config.bot}`:
            if (isAdmin(msg.from.id)) {
                if (msg.reply_to_message != undefined) {
                    let p = msg.reply_to_message.photo;
                    if (p != undefined) {
                        let fid = await bot.sendMessage(chatId, `@${msg.from.username} 載入中...`);
                        let file_id = p[p.length - 1]['file_id']
                        let file_path = (await bot.getFile(file_id))['file_path'];

                        MongoPool.getInstance(async (client) => {
                            let db = client.db(config.db_name)
                            try {
                                let jsoninfo = await getTg(`https://api.telegram.org/file/bot${config.bot_token}/${file_path}`, `tg-${msg.reply_to_message.message_id}`, `https://t.me/${msg.reply_to_message.chat.username}/${msg.reply_to_message.message_id}`)
                                db.collection(config.db_name).insertOne(jsoninfo)
                                bot.editMessageText(`@${msg.from.username} 任務完成: ${jsoninfo.file}`, {
                                    "chat_id": chatId,
                                    "message_id": fid.message_id
                                })
                                sendPic(jsoninfo.file, `來源: ${jsoninfo.from}`)
                            } catch (e) {
                                console.log(e)
                                bot.editMessageText(`@${msg.from.username} 載入圖像時發生錯誤！目標可能不存在或伺服器故障`, {
                                    "chat_id": chatId,
                                    "message_id": fid.message_id
                                })
                            }
                        });
                    } else {
                        bot.sendMessage(chatId, `@${msg.from.username} 只能回覆圖片！`);
                    }
                } else {
                    bot.sendMessage(chatId, `@${msg.from.username} 請回覆一張圖片！`);
                }
            } else {
                bot.sendMessage(chatId, `@${msg.from.username} 你不是管理員哦！不能使用這條命令`);
            }
            break
        case "/getphoto": case `/getphoto${config.bot}`:
            if (msgInfo.length > 1) {
                sendPic(msgInfo[1].replace("/", '').replace('\\', '').replace('..', ''), '')
            } else {
                bot.sendMessage(chatId, `@${msg.from.username} 傳入值錯誤！\n/getphoto filename`);
            }
            break
        case "/addadmin": case `/addadmin${config.bot}`:
            if (isAdmin(msg.from.id) && msg.reply_to_message != undefined) {
                config.admin.push(msg.reply_to_message.from.id);
                fs.writeFileSync("./config.json", JSON.stringify(config))
                bot.sendMessage(chatId, `添加管理員: ${msg.reply_to_message.from.id}`);
            }
            break
        case "/deladmin": case `/deladmin${config.bot}`:
            if (isAdmin(msg.from.id) && msg.reply_to_message != undefined) {
                let index = config.admin.indexOf(msg.reply_to_message.from.id);
                if (index != -1) {
                    config.admin.splice(index, 1);
                    fs.writeFileSync("./config.json", JSON.stringify(config))
                    bot.sendMessage(chatId, `刪除管理員: ${msg.reply_to_message.from.id}`);
                } else {
                    bot.sendMessage(chatId, `目標不是管理員`);
                }
            }
            break
        case "/status": case `/status${config.bot}`:
            MongoPool.getInstance(async (client) => {
                let db = client.db(config.db_name)
                db.collection(config.db_name).count().then(res => {
                    bot.sendMessage(chatId, `Pong! 現在共有 ${res} 張色圖！`)
                })
            })
            break
        case "/start": case `/start${config.bot}`:
            bot.sendMessage(chatId, `這是一個開源的隨機色圖Bot，支援添加Pixiv和Telegram圖片訊息內容。\n/hentai 隨機色圖\n/addpixiv 從Pixiv添加圖片\n/addphoto 從Telegram添加圖片\n/status Bot狀態\nGitHub: https://github.com/ArsFy/katonei_bot`);
            break
    }
})

bot.on("callback_query", async (even) => {
    const chatId = even.message.chat.id;

    const sendPic = async (file, msg, mid, s) => {
        if (mid != undefined) {
            bot.editMessageCaption(msg, {
                "chat_id": chatId,
                "message_id": mid
            })
        } else {
            if (time[even.chat.id] == undefined ? 0 : time[even.chat.id] < new Date() - 5000) {
                time[even.chat.id] = new Date() / 1
                try {
                    let msginfo = await bot.sendPhoto(chatId, fs.readFileSync(`./photos/${file}`), {
                        caption: msg,
                        "reply_markup": {
                            "inline_keyboard": s ? [
                                [{ "text": "我還要！", "callback_data": "get" }]
                            ] : []
                        }
                    })
                    return msginfo.message_id
                } catch (err) {
                    bot.sendMessage(chatId, "沒有這個檔案: " + file)
                }
            } else {
                bot.sendMessage(chatId, "太快啦...等待幾秒後再試吧！")
            }
        }
    }

    switch (even.data) {
        case "get":
            MongoPool.getInstance(async (client) => {
                let db = client.db(config.db_name)
                db.collection(config.db_name).aggregate([{ $sample: { size: 1 } }]).toArray((err, result) => {
                    switch (result[0].type) {
                        case "pixiv":
                            sendPic(result[0].file, `@${even.from.username} 作品名: ${result[0].name}\n作者: ${result[0].author}\nTag: #${result[0].taglist.join(" #")}\nPixivID: ${result[0].id}\nURL: https://pixiv.net/i/${result[0].id}`, undefined, true);
                            break
                        case "other":
                            sendPic(result[0].file, `其他來源（未記錄）`, undefined, true);
                            break
                    }
                })
            });
    }
})

console.log("Start bot...")