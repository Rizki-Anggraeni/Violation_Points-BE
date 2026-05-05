const authorize = (roles = []) => {
    // Jika argument roles berupa string tunggal, ubah ke array
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Akses ditolak. Anda tidak memiliki izin untuk aksi ini.' });
        }
        next();
    };
};

module.exports = authorize;