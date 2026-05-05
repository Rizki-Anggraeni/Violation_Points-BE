const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Ambil header Authorization dari request
    const authHeader = req.headers.authorization;

    // Pastikan header ada dan menggunakan format 'Bearer <token>'
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan atau format salah.' });
    }

    // Ambil token dari index ke-1 setelah di-split berdasarkan spasi
    const token = authHeader.split(' ')[1];

    try {
        // Verifikasi token menggunakan JWT_SECRET
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Masukkan data hasil decode (id, role, dll) ke dalam object req
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token tidak valid atau sudah kedaluwarsa.' });
    }
};

module.exports = authMiddleware;