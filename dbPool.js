const config = require('./config.json');
const MongoClient = require('mongodb').MongoClient;
const url = `mongodb://${(config.db_user != "" && config.db_pass != "") ? `${config.db_user}:${config.db_pass}@` : ""}${config.db_server}/${config.db_name}`

const option = {
    connectTimeoutMS: 1000,
    useNewUrlParser: true
};

const MongoPool = () => { }

let p_db;

const initPool = (cb) => {
    MongoClient.connect(url, option, function (err, db) {
        if (err) throw err;
        p_db = db;
        if (cb && typeof (cb) == 'function')
            cb(p_db);
    });
    return MongoPool;
}
MongoPool.initPool = initPool;

const getInstance = (cb) => {
    if (!p_db) {
        initPool(cb)
    }
    else {
        if (cb && typeof (cb) == 'function')
            cb(p_db);
    }
}
MongoPool.getInstance = getInstance;

module.exports = MongoPool;