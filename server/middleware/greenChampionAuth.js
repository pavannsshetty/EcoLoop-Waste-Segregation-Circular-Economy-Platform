const User = require('../models/User');

const greenChampionAuth = async (req, res, next) => {
    try {
        if (req.user.role !== 'green_champion') {
            return res.status(403).json({ message: 'Green Champion access only.' });
        }
        if (req.user.accountStatus === 'Inactive') {
            return res.status(403).json({ message: 'Your account is inactive. Please contact admin.' });
        }
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Authorization error.' });
    }
};

module.exports = { greenChampionAuth };
