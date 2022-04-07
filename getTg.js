const axios = require("axios");
const fs = require("fs");
const { execSync } = require('child_process');

const getTg = (url, mid, from) => {
    return new Promise((resolve, reject) => {
        axios({
            url: url,
            responseType: 'stream'
        }).then(async (res) => {
            let urll = url.split("/");
            const writer = fs.createWriteStream(`./runtime/${urll[urll.length - 1]}`);
            let error = null;
            res.data.pipe(writer);
            writer.on('error', err => {
                error = err;
                writer.close();
                reject(err);
            });
            writer.on('close', () => {
                if (!error) {
                    execSync(`${process.platform == "win32" ? "magick" : "convert"} ./runtime/${urll[urll.length - 1]} ./photos/${mid}.webp`)
                    resolve({
                        from: from,
                        type: 'tg',
                        file: `${mid}.webp`
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
    getTg
}