# Our Little World ♡

Website scrapbook romantis dari Awan untuk Bubub. Dibuat dengan HTML, CSS, dan JavaScript supaya mudah diedit.

## File
- `index.html`: isi dan struktur website
- `style.css`: warna, layout, dan responsivitas
- `script.js`: menu mobile, kartu alasan, playlist, kuis, dan surat rahasia

## Menjalankan
Ekstrak ZIP, buka folder, lalu klik dua kali `index.html`. Koneksi internet dibutuhkan untuk font Google Fonts; tanpa internet, font fallback tetap digunakan.

## Foto kalian
Kartu kenangan saat ini menggunakan ilustrasi CSS, bukan foto pasangan acak. Untuk menambah foto:
1. Buat folder `assets` dan taruh foto di sana, misalnya `first-meet.jpg`.
2. Di `index.html`, cari elemen `<div class="art telegram">` atau `<div class="art garden">`.
3. Ganti elemen ilustrasi dengan `<img class="memory-photo" src="assets/first-meet.jpg" alt="Kenangan kami">`.
4. Tambahkan CSS: `.memory-photo{display:block;width:100%;height:100%;object-fit:cover}`.

## Edit tulisan
Buka `index.html` dengan VS Code. Surat, tanggal, tempat, dan teks setiap bagian bisa diubah langsung. Gunakan panggilan **Bubub**, **Bub Sayang**, atau **Bub Sayangku** agar konsisten.

## Edit alasan
Kartu utama berada di bagian `reasons` dalam `index.html`. Alasan tambahan berada di array `extras` dalam `script.js`.

## Lagu
Lagu saat ini membuka pencarian YouTube agar tidak berpura-pura memutar audio yang belum disediakan. Untuk memakai tautan lagu resmi yang tepat, ganti atribut `href` pada setiap elemen `.song` di `index.html`. Nama lagu/artis disimpan di `data-title` dan `data-artist`. Panasea — Rumah Sakit tetap menjadi pilihan pertama. Jangan mengunggah ulang lagu berhak cipta tanpa izin.

## Edit kuis
Pertanyaan ada di array `questions` di `script.js`. `a` adalah indeks jawaban benar dimulai dari 0 (A=0, B=1, dan seterusnya).

## Publish gratis
1. Buka https://www.netlify.com/ lalu masuk atau buat akun.
2. Deploy website statis dengan mengunggah folder hasil ekstrak yang berisi `index.html`, `style.css`, dan `script.js` (ikuti pilihan deploy manual yang tersedia di dashboard).
3. Salin URL publik yang diberikan Netlify dan tes di HP.
4. Kirim URL itu lewat WhatsApp ke Bubub.

Alternatif: unggah file ke repository GitHub lalu aktifkan GitHub Pages pada pengaturan repository.

## Catatan
Foto pribadi belum dimasukkan. Tautan musik adalah pencarian YouTube, bukan pemutar audio tertanam. Ganti tautan dengan halaman lagu resmi yang tepat kalau sudah ditemukan.
