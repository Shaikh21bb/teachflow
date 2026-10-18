const app = require('../server/index.js');
module.exports = async (req, res) => {
    await app.ready();
    return app(req, res);
};
