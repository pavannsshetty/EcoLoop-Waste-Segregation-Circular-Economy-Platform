const jwt = require('jsonwebtoken');

const adminProtect = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized.' });
  }
  try {
    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET + '_admin');
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Admin access only.' });
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired.' });
  }
};

module.exports = { adminProtect };
