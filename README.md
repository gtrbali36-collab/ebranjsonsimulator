# JSON Insights Hub

Create Dashboard Tools untuk Membaca JSON. Jadi ada Fitur untuk Upload File Jason / Input Link / dan Button Proses ketika di Klik maka kamu akan membaca keseluruhan File dan Mengidentifikasi kemudian menyimpannya dalam Database . Setelah itu kmu akan Memberikan Hasil pemtaan datanya Seperti (Berapa Jumlah data , Tanggal Data, Ada Field apa saja. Item Apa saja dan Jenis datanya misal Angka / Text dll. kategorising jika ada dan lain sebagainya. Aku sudah upload File Json yang bisa kamu jadikan sebagai Bahan Source . Kemudian Fitur yang Kedua Adalah Menyeleksi Memilih dan mengambil hanya Data - data yang sesuai kebutuhan dalam Format Checklist .  Contoh Check List Berita Nasional/Berita Komisi/Berita Dapil . (Ini Bisa Pilih Salah satu atau semuanya) Kemudian . Di section Setelahnya Muncul Field / Item-item di Ketegori Tersebut yang Bisa dicentang. Contoh Jika hanya Berita nasional yang diklik maka akan Membaca Data Jason yang Diinputkan dan Hany membaca Hasil pemetaan ("kategori": "Berita Nasional" :

Tanggal data

Total seluruh item:

Total Data hanya "kategori": "Berita Nasional" ,

judul

ringkasan

total_sumber

media

url

published_at ) . Jika Semua ya Dicentang Kemudian Klik Tombol Proses. Maka Kamu bisa dengan bantuan AI. Akan Mengambil dan Menampilkan di Frontend dalam Format Tabel dilengkapi juga dengan Fitur Filter Search . Ada Tombol Save untuk menyimpannya di Database dan Tombol Reproses untuk Mengenerate ulang hasilnya. Lakukan hal yang sama di Kategori lain. Buat Halaman untuk Menampilkan data yang disimpan.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ebranjsonsimulator.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ecb9e39c-b609-4fe7-847e-8b3ef46c4908).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
