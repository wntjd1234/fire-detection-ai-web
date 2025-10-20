const Sequelize = require('sequelize');
const User = require('./user');

const env = process.env.NODE_ENV || 'development';
const config = require('../config/config')[env];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const db = {
    sequelize,
    User
};

User.init(sequelize);

module.exports = db;