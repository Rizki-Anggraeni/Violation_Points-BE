# 🏫 Backend - Sistem Pencatatan Poin Pelanggaran

Ini adalah RESTful API backend untuk Sistem Pencatatan Poin Pelanggaran Siswa, dibangun menggunakan **Node.js**, **Express.js**, dan **MongoDB**. Backend ini dilengkapi dengan sistem autentikasi berbasis **JWT** dan Otorisasi berbasis Peran (Role-Based Access Control).

## 🚀 Teknologi yang Digunakan
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (dengan Mongoose ORM)
- **Security:** JSON Web Token (JWT) & Bcrypt.js
- **Environment:** Dotenv

## 📋 Prasyarat
Sebelum menjalankan project ini, pastikan Anda telah menginstal:
- [Node.js](https://nodejs.org/) (Versi 14 atau lebih baru)
- Akun [MongoDB Atlas](https://www.mongodb.com/atlas) atau MongoDB lokal

## 🛠️ Cara Instalasi & Menjalankan

1. Buka terminal dan arahkan ke direktori `backend`:
   ```bash
   cd backend
   ```

2. Instal semua dependensi yang dibutuhkan:
   ```bash
   npm install
   ```

3. Buat file `.env` di *root* direktori `backend` dan sesuaikan dengan kredensial Anda:
   ```env
   PORT=3000
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<nama_database>?retryWrites=true&w=majority
   JWT_SECRET=rahasia_sistem_poin_pelanggaran_super_aman
   ```

4. Jalankan server:
   ```bash
   node server.js
   ```
   *(Server akan berjalan secara default di `http://localhost:3000`)*

## 🔐 Role-Based Access Control (RBAC)
Sistem ini memiliki beberapa peran (*role*) dengan hak akses yang berbeda:
- **`admin`**: Akses penuh ke semua data (Data Master & Laporan).
- **`guru_bk`**: Dapat mengelola data siswa, aturan pelanggaran, dan riwayat pelanggaran.
- **`wali_kelas`**: Dapat melihat data siswa di kelasnya, rekap presensi, dan melihat riwayat pelanggaran. Tidak dapat menambah poin pelanggaran secara langsung (hanya melalui Alpa/Terlambat di Presensi).
- **`sekretaris`**: Bertugas mencatat presensi harian untuk kelasnya berdasarkan jadwal pelajaran.
- **`ortu`**: Hanya dapat melihat data presensi dan riwayat pelanggaran milik anaknya sendiri.
- **`guru` (Default)**: Dapat melihat jadwal mengajar dan kelas.

## 📡 Struktur Endpoint API

Sebagian besar endpoint dilindungi oleh Middleware Autentikasi (`authMiddleware`) dan membutuhkan token JWT di header: `Authorization: Bearer <token>`.

### Autentikasi (`/api/auth`)
- `POST /api/auth/register` - Mendaftarkan user baru (termasuk menghubungkan ID Kelas / ID Siswa).
- `POST /api/auth/login` - Login dan mendapatkan Token JWT.

### Data Master Kelas (`/api/classes`)
- `GET /api/classes` - Melihat daftar kelas
- `POST /api/classes` - Menambahkan kelas baru
- `PUT /api/classes/:id` - Mengubah data kelas
- `DELETE /api/classes/:id` - Menghapus data kelas

### Data Master Siswa (`/api/students`)
- `GET /api/students` - Melihat semua data siswa (Difilter khusus jika role = ortu)
- `GET /api/students/:id` - Melihat detail satu siswa
- `POST /api/students` - Menambah data siswa
- `PUT /api/students/:id` / `DELETE /api/students/:id` - Mengubah/Menghapus siswa

### Jadwal Pelajaran (`/api/schedules`)
- `GET /api/schedules` - Melihat semua jadwal
- `POST /api/schedules` - Menambah jadwal baru
- `PUT` / `DELETE /api/schedules/:id` - Mengubah/Menghapus jadwal

### Rekap Presensi (`/api/attendances`)
- `GET /api/attendances` - Melihat daftar presensi (Difilter otomatis jika role = ortu)
- `POST /api/attendances` - Mencatat presensi baru (Status Alpa/Terlambat akan otomatis menambah poin pelanggaran siswa)
- `PUT` / `DELETE /api/attendances/:id` - Modifikasi catatan presensi (Dibatasi khusus untuk sekretaris kelas terkait)

### Aturan Pelanggaran (`/api/violation-rules`)
- `GET /api/violation-rules` - Melihat referensi jenis & poin pelanggaran
- `POST`, `PUT`, `DELETE /api/violation-rules` - Memodifikasi aturan (Hanya Admin & Guru BK)

### Riwayat Pelanggaran Aktual (`/api/violations`)
- `GET /api/violations` - Melihat riwayat pelanggaran yang pernah terjadi (Difilter otomatis jika role = ortu)
- `POST /api/violations` - Mencatat pelanggaran baru yang dilakukan siswa (Otomatis menambah `total_points` siswa)
- `PUT` / `DELETE /api/violations/:id` - Modifikasi data pelanggaran (Dilarang untuk Wali Kelas)

---
