process.env.NTBA_FIX_319 = 1;
const config = require('./config.json');
const express = require('express');
const app = express();

const { getPixiv } = require('./getPixiv');
const { getTg } = require('./getTg');
const MongoPool = require("./dbPool");
const fs = require("fs");
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(config.bot_token, { polling: true });

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let time = {}

const isAdmin = (id) => {
    return config.admin.indexOf(id) != -1 ? true : false
}

MongoPool.initPool()

bot.on("polling_error", console.log);

if (config.api_server) {
    (async () => {
        // Setting
        app.disable('x-powered-by');
        app.use('/photos', express.static('./photos'));

        const getPhotoApi = (req, res) => {
            MongoPool.getInstance(async (client) => {
                client.db(config.db_name).collection(config.db_name).aggregate([{ $sample: { size: 1 } }]).toArray((err, result) => {
                    res.json(result[0])
                })
            });
        }
        app.get('/api/hentai', getPhotoApi);
        app.post('/api/hentai', getPhotoApi);
        app.get('/api/hentai_img', (req, res) => {
            MongoPool.getInstance(async (client) => {
                client.db(config.db_name).collection(config.db_name).aggregate([{ $sample: { size: 1 } }]).toArray((err, result) => {
                    res.redirect(302, '/photos/' + result[0].file);
                })
            });
        })

        // Error
        app.get('*', (req, res) => res.status(404).json({ "status": 404 }));
        app.post('*', (req, res) => res.status(404).json({ "status": 404 }));
        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({ "status": 500 });
        });

        app.listen(config.api_port, () => {
            console.log("Start API...")
        })
    })()
}

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
            if ((time[chatId] == undefined ? 0 : time[chatId]) < (new Date() - 5000)) {
                time[chatId] = new Date() / 1
                try {
                    if (typeof file == "string" || file.length == 1) {
                        if (!typeof file == "string") file = file[0];
                        let msginfo = await bot.sendPhoto(chatId, fs.readFileSync(`./photos/${file}`), {
                            caption: msg,
                            "reply_markup": {
                                "inline_keyboard": s ? [
                                    [{ "text": "我還要！", "callback_data": "get" }]
                                ] : []
                            }
                        })
                        return msginfo.message_id
                    } else {
                        let imagelist = [];
                        for (let i = 0; i < file.length; i++) imagelist.push({
                            type: 'photo',
                            media: fs.readFileSync(`./photos/${file[i]}`),
                            ...(i == 0 ? {
                                caption: msg,
                                "reply_markup": {
                                    "inline_keyboard": s ? [
                                        [{ "text": "我還要！", "callback_data": "get" }]
                                    ] : []
                                }
                            } : {})
                        })
                        bot.sendMediaGroup(chatId, imagelist);
                    }
                } catch (err) {
                    console.log("ReadErr:", err)
                    bot.sendMessage(chatId, "讀圖片失敗，請重試")
                }
            } else {
                bot.sendMessage(chatId, "太快啦...等待幾秒後再試吧！")
            }
        }
    }

    let username = msg.from.username != undefined ? msg.from.username : msg.from.id

    switch (msgInfo[0]) {
        case "/hentai": case `/hentai${config.bot}`:
            MongoPool.getInstance(async (client) => {
                let db = client.db(config.db_name)
                if (msgInfo.length == 1) db.collection(config.db_name).aggregate([{ $sample: { size: 1 } }]).toArray((err, result) => {
                    if (result.length != 0) {
                        switch (result[0].type) {
                            case "pixiv":
                                sendPic(result[0].file, `@${username} 作品名: ${result[0].name}\n作者: ${result[0].author}\nTag: #${result[0].taglist.join(" #")}\nPixivID: ${result[0].id}\nURL: https://pixiv.net/i/${result[0].id}`, undefined, true);
                                break
                            case "other":
                                sendPic(result[0].file, `其他來源（未記錄）`, undefined, true);
                                break
                        }
                    } else {
                        bot.sendMessage(chatId, "無內容，請先添加圖片")
                    }
                }); else db.collection(config.db_name).aggregate([{ $match: { taglist: msgInfo[1] } }, { $sample: { size: 1 } }]).toArray((err, result) => {
                    if (result.length != 0) {
                        switch (result[0].type) {
                            case "pixiv":
                                sendPic(result[0].file, `@${username} 作品名: ${result[0].name}\n作者: ${result[0].author}\nTag: #${result[0].taglist.join(" #")}\nPixivID: ${result[0].id}\nURL: https://pixiv.net/i/${result[0].id}`, undefined, true);
                                break
                            case "other":
                                sendPic(result[0].file, `其他來源（未記錄）`, undefined, true);
                                break
                        }
                    } else {
                        bot.sendMessage(chatId, "不存在包含這個 TAG 的項")
                    }
                })
            });
            break;
        case "/addpixiv": case `/addpixiv${config.bot}`:
            if (isAdmin(msg.from.id)) {
                if (msgInfo.length > 1 ? !isNaN(Number(msgInfo[1])) : false) {
                    let mid = await bot.sendMessage(chatId, `@${username} 載入中... 目標: Pixiv ID ${msgInfo[1]}`);
                    MongoPool.getInstance(async (client) => {
                        let db = client.db(config.db_name)
                        try {
                            let jsoninfo = await getPixiv(Number(msgInfo[1]))
                            db.collection(config.db_name).insertOne(jsoninfo)
                            bot.editMessageText(`@${username} 任務完成 (${msgInfo[1]})`, {
                                "chat_id": chatId,
                                "message_id": mid.message_id
                            })
                            sendPic(jsoninfo.file, `作品名: ${jsoninfo.name}\n作者: ${jsoninfo.author}\nTag: #${jsoninfo.taglist.join(" #")}\nPixivID: ${jsoninfo.id}\nURL: https://pixiv.net/i/${jsoninfo.id}`)
                        } catch (e) {
                            console.log(e)
                            if (String(e).indexOf("errmsg") != -1) bot.editMessageText(`@${username} ${e.split("errmsg:")[1]}`, {
                                "chat_id": chatId,
                                "message_id": mid.message_id
                            }); else bot.editMessageText(`@${username} 載入圖像時發生錯誤！目標可能不存在或伺服器故障`, {
                                "chat_id": chatId,
                                "message_id": mid.message_id
                            })
                        }
                    });
                } else {
                    bot.sendMessage(chatId, `@${username} 傳入值錯誤！\n/addpixiv PixivID(Number)`);
                }
            } else {
                bot.sendMessage(chatId, `@${username} 你不是管理員哦！不能使用這條命令`);
            }
            break
        case "/addpixivlist": case `/addpixivlist${config.bot}`:
            if (isAdmin(msg.from.id)) {
                if (msgInfo.length > 1) {
                    let mid = await bot.sendMessage(chatId, `@${username} 載入中... ${msgInfo.length - 1}個目標`);
                    MongoPool.getInstance(async (client) => {
                        let db = client.db(config.db_name)
                        let idlist = msgInfo.slice(1, msgInfo.length);
                        let err = 0;
                        let errlist = [];
                        for (let i = 1; i < idlist.length; i++) {
                            try {
                                let jsoninfo = await getPixiv(Number(msgInfo[i]))
                                db.collection(config.db_name).insertOne(jsoninfo)
                                bot.editMessageText(`@${username} 載入中 (${i + 1}/${msgInfo.length - 1})`, {
                                    "chat_id": chatId,
                                    "message_id": mid.message_id
                                })
                            } catch (e) {
                                console.log(e)
                                err++
                                errlist.push(Number(msgInfo[i]))
                                if (e.indexOf("errmsg") != -1) bot.editMessageText(`@${username} ${e.split("errmsg:")[1]}`, {
                                    "chat_id": chatId,
                                    "message_id": mid.message_id
                                });
                            }
                            await sleep(3000)
                        }
                        bot.editMessageText(`@${username} 任務完成 (${err}次錯誤${err != 0 ? ": " : ""}${errlist.join(", ")})`, {
                            "chat_id": chatId,
                            "message_id": mid.message_id
                        })
                    });
                } else {
                    bot.sendMessage(chatId, `@${username} 傳入值錯誤！\n/addpixivlist PixivID1 PixivID2 PixivID3 ....`);
                }
            } else {
                bot.sendMessage(chatId, `@${username} 你不是管理員哦！不能使用這條命令`);
            }
            break
        case "/addphoto": case `/addphoto${config.bot}`:
            if (isAdmin(msg.from.id)) {
                if (msg.reply_to_message != undefined) {
                    let p = msg.reply_to_message.photo;
                    if (p != undefined) {
                        let fid = await bot.sendMessage(chatId, `@${username} 載入中...`);
                        let file_id = p[p.length - 1]['file_id']
                        let file_path = (await bot.getFile(file_id))['file_path'];

                        MongoPool.getInstance(async (client) => {
                            let db = client.db(config.db_name)
                            try {
                                let jsoninfo = await getTg(`https://api.telegram.org/file/bot${config.bot_token}/${file_path}`, `tg-${msg.reply_to_message.message_id}`, `https://t.me/${msg.reply_to_message.chat.username}/${msg.reply_to_message.message_id}`)
                                db.collection(config.db_name).insertOne(jsoninfo)
                                bot.editMessageText(`@${username} 任務完成: ${jsoninfo.file}`, {
                                    "chat_id": chatId,
                                    "message_id": fid.message_id
                                })
                                sendPic(jsoninfo.file, `來源: ${jsoninfo.from}`)
                            } catch (e) {
                                console.log(e)
                                bot.editMessageText(`@${username} 載入圖像時發生錯誤！目標可能不存在或伺服器故障`, {
                                    "chat_id": chatId,
                                    "message_id": fid.message_id
                                })
                            }
                        });
                    } else {
                        bot.sendMessage(chatId, `@${username} 只能回覆圖片！`);
                    }
                } else {
                    bot.sendMessage(chatId, `@${username} 請回覆一張圖片！`);
                }
            } else {
                bot.sendMessage(chatId, `@${username} 你不是管理員哦！不能使用這條命令`);
            }
            break
        case "/getphoto": case `/getphoto${config.bot}`:
            if (msgInfo.length > 1) {
                sendPic(msgInfo[1].replace("/", '').replace('\\', '').replace('..', ''), '')
            } else {
                bot.sendMessage(chatId, `@${username} 傳入值錯誤！\n/getphoto filename`);
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
            bot.sendMessage(chatId, `這是一個開源的隨機色圖Bot，支援添加Pixiv和Telegram圖片內容。\n/hentai 隨機色圖\n/addpixiv 從Pixiv添加圖片\n/addphoto 從Telegram添加圖片\n/status Bot狀態\nGitHub: https://github.com/ArsFy/katonei_bot`);
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
            if ((time[chatId] == undefined ? 0 : time[chatId]) < (new Date() - 5000)) {
                time[chatId] = new Date() / 1
                try {
                    if (typeof file == "string" || file.length == 1) {
                        if (!typeof file == "string") file = file[0];
                        let msginfo = await bot.sendPhoto(chatId, fs.readFileSync(`./photos/${file}`), {
                            caption: msg,
                            "reply_markup": {
                                "inline_keyboard": s ? [
                                    [{ "text": "我還要！", "callback_data": "get" }]
                                ] : []
                            }
                        })
                        return msginfo.message_id
                    } else {
                        let imagelist = [];
                        for (let i = 0; i < file.length; i++) imagelist.push({
                            type: 'photo',
                            media: fs.readFileSync(`./photos/${file[i]}`),
                            ...(i == 0 ? {
                                caption: msg,
                                "reply_markup": {
                                    "inline_keyboard": s ? [
                                        [{ "text": "我還要！", "callback_data": "get" }]
                                    ] : []
                                }
                            } : {})
                        })
                        bot.sendMediaGroup(chatId, imagelist);
                    }
                } catch (err) {
                    bot.sendMessage(chatId, "讀圖片失敗，請重試")
                }
            } else {
                bot.sendMessage(chatId, "太快啦...等待幾秒後再試吧！")
            }
        }
    }

    switch (even.data) {
        case "get":
            bot.answerCallbackQuery(even.id, { "text": "好！" });
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