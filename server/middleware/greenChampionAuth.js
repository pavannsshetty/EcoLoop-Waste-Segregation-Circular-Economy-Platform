const User = require('../models/User');

const greenChampionAuth = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(403).json({ message: 'Green Champion access only.' });
        }
        if (user.role !== 'green_champion') {
            return res.status(403).json({ message: 'Green Champion access only.' });
        }
        if (user.accountStatus === 'Inactive') {
            return res.status(403).json({ message: 'Your account is inactive. Please contact admin.' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Authorization error.' });
    }
};

module.exports = { greenChampionAuth };
