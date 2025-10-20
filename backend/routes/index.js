const express = require('express');
const {User} = require('../models');


const router = express.Router();

router.get('/users', async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'description']
        });
        res.json(users);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.get('/data', async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'description'],
            include: {
                model: Comment
            }
        });
        res.json(users);
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;