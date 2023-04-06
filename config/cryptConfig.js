const crypto = require('crypto');

function md5(password, salt= 'ernitropbg') {
    let hash = crypto.createHash('md5');
    hash.update(salt);
    hash.update(password);
    return hash.digest('hex');
}

module.exports = { md5 };
