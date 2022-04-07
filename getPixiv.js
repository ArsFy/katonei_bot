const config = require("./config.json");
const axios = require("axios");
const fs = require("fs");
const { execSync } = require('child_process');

const headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "zh-TW,zh-HK;q=0.9,zh-CN;q=0.8,zh;q=0.7,en-GB;q=0.6,en;q=0.5,en-US;q=0.4",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36 Edg/100.0.1185.29",
    "cookie": config.cookie
}

const getPixiv = (id) => {
    return new Promise((resolve, reject) => {
        axios({
            header: headers,
            url: `https://www.pixiv.net/artworks/${id}`
        }).then(async (res) => {
            let jsonData = JSON.parse(
                new RegExp(/\<meta\ name\=\"preload\-data\"\ id\=\"meta\-preload\-data\"\ content\=\'(.*)\'>/)
                    .exec(res.data)[0].replace(`<meta name="preload-data" id="meta-preload-data" content='`, '').replace("'>", '')
            ).illust[id];
            let taglist = [];
            for (let i in jsonData.tags.tags) {
                taglist.push(jsonData.tags.tags[i].tag)
            }
            let res_file = await axios({
                url: jsonData.urls.original,
                headers: {
                    ...headers,
                    referer: "https://www.pixiv.net/"
                },
                responseType: 'stream'
            })
            let urll = jsonData.urls.original.split("/");
            const writer = fs.createWriteStream(`./runtime/${urll[urll.length - 1]}`);
            let error = null;
            res_file.data.pipe(writer);
            writer.on('error', err => {
                error = err;
                writer.close();
                reject(err);
            });
            writer.on('close', () => {
                if (!error) {
                    execSync(`${process.platform == "win32" ? "magick" : "convert"} ./runtime/${urll[urll.length - 1]} ./photos/${id}.webp`)
                    resolve({
                        id: id,
                        name: jsonData.title,
                        author: jsonData.userName,
                        taglist: taglist,
                        type: 'pixiv',
                        file: `${id}.webp`
                    })
                } else {
                    reject(error);
                }
            })
        }).catch(err => {
            reject(err);
        })
    })
}

module.exports = {
    getPixiv
}