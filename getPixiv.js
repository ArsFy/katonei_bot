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
}

const saveImage = (filename, id, index, res_file) => {
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(`./runtime/${filename}`);
        let error = null;
        res_file.pipe(writer);
        writer.on('error', err => {
            error = err;
            writer.close();
            reject(err);
        });
        writer.on('close', () => {
            if (!error) {
                execSync(`magick ./runtime/${filename} ./photos/${id}-p${index}.webp`)
                resolve(1)
            } else {
                reject(error);
            }
        })
    })
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
            for (let i in jsonData.tags.tags) taglist.push(jsonData.tags.tags[i].tag);
            const isR18 = taglist.indexOf("R-18") != -1;
            if ((isR18 || jsonData.urls.original == null) && config["pixiv-headless"].indexOf("http") != -1) {
                let res_ph = await axios({
                    method: 'POST',
                    url: `${config["pixiv-headless"]}/api/get_image`,
                    data: { token: config["pixiv-headless-token"], i: id },
                })
                let filelist = [];
                for (let i = 0; i < res_ph.data.image.length; i++) {
                    let img_file = await axios({
                        url: res_ph.data.image[i],
                        headers: {
                            ...headers,
                            referer: "https://www.pixiv.net/"
                        },
                        responseType: 'stream'
                    })
                    let urll = res_ph.data.image[i].split("/");
                    await saveImage(urll[urll.length - 1], id, i, img_file.data)
                    filelist.push(`${id}-p${i}.webp`);
                }
                resolve({
                    id: id,
                    name: jsonData.title,
                    author: jsonData.userName,
                    taglist: taglist,
                    type: 'pixiv',
                    multiple: 1,
                    file: filelist
                })
            } else if (isR18 || jsonData.urls.original == null) {
                reject('errmsg:可能是限制級内容或無法正常請求 Pixiv，請配置 Pixiv-Headless 解決問題');
            } else {
                let filelist = [];
                for (let i = 0; i < jsonData.sl - 1; i++) {
                    let img_file = await axios({
                        url: jsonData.urls.original.replace("p0.", `p${i}.`),
                        headers: {
                            ...headers,
                            referer: "https://www.pixiv.net/"
                        },
                        responseType: 'stream'
                    })
                    let urll = jsonData.urls.original.replace("p0.", `p${i}.`).split("/");
                    await saveImage(urll[urll.length - 1], id, i, img_file.data)
                    filelist.push(`${id}-p${i}.webp`);
                }
                resolve({
                    id: id,
                    name: jsonData.title,
                    author: jsonData.userName,
                    taglist: taglist,
                    type: 'pixiv',
                    multiple: 1,
                    file: filelist
                })
            }
        }).catch(err => {
            reject(err);
        })
    })
}

module.exports = {
    getPixiv
}