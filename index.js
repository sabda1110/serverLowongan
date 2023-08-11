const PORT = 8000;
const express = require('express');
const User = require('./model/user');
const Lowongan = require('./model/lowongan');
const Daftar = require('./model/daftar');
const Mesengger = require('./model/mesengger');
require('./util/db');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  const generateId = uuidv4();
  const hasHedPassword = await bcrypt.hash(password, 10);

  try {
    const cekEmail = await User.findOne({ email });

    if (cekEmail) {
      return res.status(409).send('Email Sudah Ada Silahkan Login');
    }
    const emailKecil = email.toLowerCase();

    const data = {
      user_id: generateId,
      email: emailKecil,
      password: hasHedPassword,
      level: 'Pelamar'
    };
    const interstedUser = await User.insertMany(data);
    const user = interstedUser[0];
    const token = jwt.sign({ user }, emailKecil, {
      expiresIn: 60 * 24
    });

    res.status(201).json({ token, userId: generateId });
  } catch (err) {
    console.log(err);
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    const tesPassword = user === null ? 'tes' : user.password;
    const correctPassword = await bcrypt.compare(password, tesPassword);

    if (user && correctPassword) {
      const token = jwt.sign({ user }, email, { expiresIn: 60 * 24 });
      res.status(201).send({ token, userId: user.user_id, level: user.level });
    } else if (user === null && tesPassword === 'tes') {
      res.status(400).send('Email Belum Terdaftar');
    } else {
      res.status(400).send('Data Tidak Cocok');
    }
  } catch (err) {
    console.log('budi');
  }
});

app.put('/user', async (req, res) => {
  const formData = req.body.formData;

  try {
    const query = { user_id: formData.user_id };
    const updateDocument = {
      $set: {
        fullName: formData.fullName,
        gender: formData.gender,
        dobDay: formData.dobDay,
        dobMount: formData.dobMount,
        dobYear: formData.dobYear,
        divisi: formData.divisi,
        noHp: formData.noHp,
        pendidikan: {
          sd: formData.pendidikan.sd,
          smp: formData.pendidikan.smp,
          smk: formData.pendidikan.smk,
          sarjana: formData.pendidikan.sarjana
        },
        riwayatPekerjaan: {
          pekerjaanPertama: formData.riwayatPekerjaan.pekerjaanPertama,
          pekerjaanKedua: formData.riwayatPekerjaan.pekerjaanKedua
        },
        about: formData.about,
        url: formData.url,
        matches: formData.matches,
        skill: {
          skillPertama: formData.skill.skillPertama,
          skillKedua: formData.skill.skillKedua,
          skillKetiga: formData.skill.skillKetiga,
          skillEmpat: formData.skill.skillEmpat
        }
      }
    };

    const insertUser = await User.updateOne(query, updateDocument);
    res.status(201).send(insertUser);
  } catch (err) {
    console.log(err);
  }
});

app.get('/user', async (req, res) => {
  const userId = req.query.userId;

  try {
    const query = { user_id: userId };
    const user = await User.findOne(query);
    res.send(user);
  } catch (err) {
    console.log(err);
  }
});

app.get('/get-lowongan', async (req, res) => {
  const { divisi, userId } = req.query;
  const response = [];
  const wl = 0.7;
  const wj = 0.3;
  let pendidikan = 0;
  let gender = 0;
  const user = await User.findOne({ user_id: userId });

  //Pendidikan
  if (user.pendidikan.sarjana !== '') pendidikan = 3;
  if (user.pendidikan.smk !== '') pendidikan = 2;

  //Jensi Kelamin
  if (user.gender === 'Woman') gender = 2;
  if (user.gender === 'Man') gender = 1;

  try {
    const query = { divisi: divisi };
    const lowongan = await Lowongan.find(query);
    lowongan.map((item) => {
      let tanggalLowonganObjek = new Date(
        `${item.waktuLowongan.dobMount} ${item.waktuLowongan.dobDay}, ${item.waktuLowongan.dobYear}`
      );
      const tanggalSekarang = new Date();
      if (tanggalSekarang > tanggalLowonganObjek) {
        console.log('Data kadaluarsa');
      } else {
        response.push(item);
      }
    });

    // res.send(response);
    const data = [];
    response.map((item) => {
      let lowonganPendidikan = 0;
      let lowonganJenisKelamin = 0;

      //Pendidikan
      if (item.pendidikan === 'SMP') lowonganPendidikan = 1;
      if (item.pendidikan === 'SLTA') lowonganPendidikan = 2;
      if (item.pendidikan === 'Sarjana 1') lowonganPendidikan = 3;
      if (item.pendidikan === 'Sarjana 2') lowonganPendidikan = 4;

      //Jenis Kelamin
      if (item.gender === 'Woman') lowonganJenisKelamin = 2;
      if (item.gender === 'Man') lowonganJenisKelamin = 1;
      if (item.gender === 'More') lowonganJenisKelamin = 0;

      const nilaiKecocokan =
        wl * Math.abs(pendidikan - lowonganPendidikan) +
        wj * Math.abs(gender - lowonganJenisKelamin);

      if (nilaiKecocokan <= 0.7) data.push(item);
    });

    res.send(data);
  } catch (err) {
    console.log(err);
  }
});

app.get('/get-divisi', async (req, res) => {
  const userId = req.query.userId;

  try {
    const query = { user_id: userId };
    const divisi = await User.findOne(query);
    res.send(divisi);
  } catch (err) {
    res.status(400).send('Data Tidak Ketemu');
  }
});

app.post('/lowongan', async (req, res) => {
  const { formData, skill } = req.body;
  const generateId = uuidv4();

  const angkaBulan = formData.waktuLowongan.dobMount;
  const bulan = new Date(
    formData.waktuLowongan.dobYear,
    angkaBulan - 1,
    1
  ).toLocaleString('default', { month: 'long' });
  let gender = Object.keys(formData.gender).length;
  let genderPasti = '';
  if (
    gender === 2 &&
    formData.gender.man !== '' &&
    formData.gender.woman !== ''
  ) {
    genderPasti = 'More';
  } else if (
    gender === 2 &&
    formData.gender.man !== '' &&
    formData.gender.woman === ''
  ) {
    genderPasti = 'Man';
  } else if (
    gender === 2 &&
    formData.gender.man === '' &&
    formData.gender.woman !== ''
  ) {
    genderPasti = 'Woman';
  } else if (
    gender !== 2 &&
    formData.gender.man !== '' &&
    !formData.gender.woman
  ) {
    genderPasti = 'Man';
  } else if (gender !== 2 && formData.gender.woman !== '') {
    genderPasti = 'Woman';
  }

  const data = {
    ...formData,
    skill: skill,
    lowongan_id: generateId,
    ketersedian: 'Aktif',
    gender: genderPasti,
    waktuLowongan: { ...formData.waktuLowongan, dobMount: bulan }
  };
  //` Pengecekan Tanggal
  const tanggalLowonganObjek = new Date(
    `${formData.waktuLowongan.dobMount} ${formData.waktuLowongan.dobDay}, ${formData.waktuLowongan.dobYear}`
  );

  const tanggalSekarang = new Date();

  try {
    // Tanggal Kadaluarsa
    if (tanggalSekarang > tanggalLowonganObjek) {
      res.status(200).send('Tanggal Kadaluarsa');
    } else {
      const interstedLowongan = await Lowongan.insertMany(data);
      const lowongan = interstedLowongan[0];
      res.status(201).send({ lowongan });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post('/daftar-lowongan', async (req, res) => {
  const waktuSekarang = new Date();
  let options = { year: 'numeric', month: 'long', day: 'numeric' };
  const tanggalBulanTahun = waktuSekarang.toLocaleDateString('id-ID', options);

  const { lowongan_id, pelamar_id, tanggal } = req.body;
  const daftar_id = uuidv4();
  const tanggalLowonganObjek = new Date(
    `${tanggal.dobMount} ${tanggal.dobDay}, ${tanggal.dobYear}`
  );
  const tanggalSekarang = new Date();
  if (tanggalSekarang > tanggalLowonganObjek) {
    res.status(400).send('Lowongan Sudah Tutup');
  } else {
    try {
      const cekData = await Daftar.findOne({ lowongan_id, pelamar_id });
      const cekLowongan = await Lowongan.findOne({
        lowongan_id,
        ketersedian: 'Non-aktif'
      });
      if (cekData) {
        res.status(409).send('Anda Sudah Mendaftar');
      } else if (cekLowongan) {
        res.status(409).send('Lowongan Sudah Tidak Tersedian');
      } else {
        const data = {
          daftar_id: daftar_id,
          pelamar_id: pelamar_id,
          lowongan_id: lowongan_id,
          tanggalDaftar: tanggalBulanTahun,
          status: 'Proses'
        };
        const interstDaftar = await Daftar.insertMany(data);
        const daftar = interstDaftar[0];
        res.status(201).send(daftar);
      }
    } catch (err) {
      console.log(err);
    }
  }
});

app.get('/get-data-lowongan', async (req, res) => {
  const user_id = req.query.userId;
  try {
    const query = { user_id: user_id };
    const lowongan = await Lowongan.find(query);
    res.send(lowongan);
  } catch (err) {
    console.log(err);
  }
});
app.get('/get-pelamar', async (req, res) => {
  const lowongan_id = req.query.lowongan_id;
  const penampung = [];

  try {
    const query = { lowongan_id: lowongan_id };
    const daftar = await Daftar.find(query);

    daftar.map((item) => {
      if (item?.status !== 'Batal Pegajuan') {
        penampung.push(item);
      }
    });

    const pelamar = penampung.map((item) => {
      return item?.pelamar_id !== undefined ? item.pelamar_id : 'Kosong';
    });

    const promises = pelamar.map((id) => {
      return User.findOne({ user_id: id });
    });
    const dataPelamar = await Promise.all(promises);
    res.send(dataPelamar);
  } catch (err) {
    console.log(err);
  }
});

app.get('/get-daftar', async (req, res) => {
  const user_id = req.query.userId;
  try {
    const daftar = await Daftar.find({ pelamar_id: user_id });
    const promises = daftar.map((item) => {
      return Lowongan.findOne({ lowongan_id: item.lowongan_id });
    });

    const dataLowongan = await Promise.all(promises);
    const response = daftar.map((item, i) => {
      if (item.lowongan_id === dataLowongan[i].lowongan_id) {
        return {
          daftar_id: item.daftar_id,
          tanggal: item.tanggalDaftar,
          tanggalLowongan: dataLowongan[i].waktuLowongan,
          lowongan: dataLowongan[i].pekerjaan,
          lowongan_id: dataLowongan[i].lowongan_id,
          divisiPelamar: dataLowongan[i].divisi,
          status: item.status,
          nilai: item.nilai
        };
      }
    });
    res.send(response);
  } catch (err) {
    console.log(err);
  }
});

app.put('/addMatch', async (req, res) => {
  const { lowongan_id, user_id } = req.body;

  try {
    const hasil = await Lowongan.findOne({ lowongan_id });
    const result = hasil.pelamar.find((item) => {
      return item.user_id === user_id;
    });

    if (result) {
      res.status(400).send('Data Sudah Match');
    } else {
      const query = { lowongan_id: lowongan_id };
      const updateDocument = {
        $push: {
          pelamar: { user_id: user_id }
        }
      };
      const queryUpdate = { lowongan_id, pelamar_id: user_id };
      const updateDocumentDaftar = {
        $set: {
          status: 'Match'
        }
      };
      await Daftar.updateOne(queryUpdate, updateDocumentDaftar);
      const lowongan = await Lowongan.updateOne(query, updateDocument);
      res.send(lowongan).status(200);
    }
  } catch (err) {
    console.log(err);
  }
});

app.get('/users', async (req, res) => {
  const userIds = JSON.parse(req.query.userIds);
  const pekerjaan = req.query.pekerjaan;
  const lowongan_id = req.query.lowongan_id;

  try {
    const data = await Daftar.find({
      pelamar_id: { $in: userIds },
      lowongan_id,
      $or: [{ status: 'Match' }, { status: 'Tahap1' }, { status: 'Terima' }]
    });

    const userId = [];
    data.map((item) => {
      userId.push(item.pelamar_id);
    });

    const users = await User.find({ user_id: { $in: userId } });
    res.send({ users, pekerjaan, lowongan_id });
  } catch (err) {
    console.log(err);
  }
});

app.get('/mesenggers', async (req, res) => {
  const { dari, tujuan } = req.query;

  try {
    const query = { from_userId: dari, to_userId: tujuan };
    const response = await Mesengger.find(query);

    res.send(response);
  } catch (err) {
    res.status(400).send('Mulai chat?');
  }
});

app.post('/add-mesengger', async (req, res) => {
  const mesengger = req.body.mesengger;
  try {
    const insertMesengger = await Mesengger.insertMany(mesengger);
    res.status(201).send(insertMesengger[0]);
  } catch (err) {
    res.status(400).send('Pesan Tidak Terkirim');
  }
});

app.post('/addMesengger', async (req, res) => {
  const mesengger = req.body.mesengger;
  try {
    const query = {
      pelamar_id: mesengger.to_userId,
      lowongan_id: mesengger.lowongan_id
    };
    const daftar = await Daftar.findOne(query);

    const data = {
      ...mesengger,
      status: daftar ? daftar.status : ''
    };

    const insertMesengger = await Mesengger.insertMany(data);
    res.status(201).send(insertMesengger[0]);
  } catch (err) {
    res.status(400).send('Kegagalan Ngeload');
  }
});

app.get('/get-match-pelamar', async (req, res) => {
  const { user_id } = req.query;
  const data = [];
  const result = [];
  const seenUserIds = new Set();
  const hasilAhkir = [];
  const resultFix = [];

  try {
    const nilai = await Mesengger.find({ to_userId: user_id, status: 'Match' });
    nilai.map((item, i) => {
      const dataObj = {
        user_id: item.from_userId,
        lowongan_id: item.lowongan_id
      };
      data.push(dataObj);
    });

    data.forEach((item) => {
      if (!seenUserIds.has(item.lowongan_id)) {
        result.push(item);
        seenUserIds.add(item.lowongan_id);
      }
    });

    result.map((item) => {
      if (item.lowongan_id !== '') {
        resultFix.push(item);
      }
    });

    const promises = resultFix.map((item) => {
      return User.findOne({ user_id: item.user_id });
    });

    const matchs = await Promise.all(promises);

    const promisesLowongan = resultFix.map((item) => {
      return Lowongan.findOne({ lowongan_id: item.lowongan_id });
    });

    const lowongan = await Promise.all(promisesLowongan);

    const hasilAhkir = matchs.map((match, index) => {
      return {
        ...match.toObject(),
        lowongan_id: lowongan[index].lowongan_id,
        pekerjaan: lowongan[index].pekerjaan
      };
    });

    res.send(hasilAhkir);
  } catch (err) {
    console.log(err);
  }
});

app.get('/get-history-chat', async (req, res) => {
  const { user_id } = req.query;
  try {
    const penampung = [];
    const daftar = await Mesengger.find({ from_userId: user_id });
    const data = daftar.map((item) => {
      return Mesengger.distinct('to_userId', {
        to_userId: { $in: item.to_userId }
      });
    });

    const response = await Promise.all(data);
    const daata = response
      .map(JSON.stringify)
      .filter((e, i, a) => i === a.indexOf(e))
      .map(JSON.parse);

    daata.map((item) => {
      penampung.push(item[0]);
    });

    const responseMatch = penampung.map((item) => {
      return Mesengger.findOne({
        $and: [{ from_userId: item }, { to_userId: user_id }]
      });
    });

    const itemTes = await Promise.all(responseMatch);

    const resultFix = [];
    itemTes.map((item) => {
      if (item !== null) {
        resultFix.push(item);
      }
    });

    const promiseUser = resultFix.map((item) => {
      return User.findOne({ user_id: item.from_userId });
    });

    const DataUser = await Promise.all(promiseUser);
    res.send(DataUser);
  } catch (err) {
    console.log(err);
  }
});

app.delete('/hapus-daftar', async (req, res) => {
  const { pelamar_id, item } = req.query;

  const tanggalLowonganObjek = new Date(
    `${item.tanggalLowongan.dobMount} ${item.tanggalLowongan.dobDay}, ${item.tanggalLowongan.dobYear}`
  );
  const tanggalSekarang = new Date();
  const riwayat = await Daftar.findOne({
    pelamar_id,
    lowongan_id: item.lowongan_id
  });

  if (tanggalSekarang > tanggalLowonganObjek) {
    res.status(400).send('Tanggal Sudah Lewat Pemrosesan ');
  } else if (
    riwayat.status === 'Match' ||
    riwayat.status === 'Terima' ||
    riwayat.status === 'Tahap1' ||
    riwayat.status === 'Tolak'
  ) {
    res.status(400).send('Status Sudah Match');
  } else {
    try {
      const updateDocument = {
        $set: {
          status: 'Batal Pegajuan'
        }
      };

      const success = await Daftar.updateOne(
        { lowongan_id: item.lowongan_id, pelamar_id },
        updateDocument
      );
      res.status(201).send(success);
    } catch (err) {
      res.status(400).send('Data Gak Sesuai');
    }
  }
});

app.get('/get-jumlah', async (req, res) => {
  const { lowongan_id } = req.query;
  try {
    const jumlahDaftar = await Daftar.find({ lowongan_id });

    res.status(200).send(jumlahDaftar);
  } catch (err) {
    console.log(err);
  }
});

app.put('/addPelamar', async (req, res) => {
  const { pelamar_id, lowongan_id, nilai } = req.body;

  try {
    const data = await Daftar.findOne({ lowongan_id, pelamar_id });
    if (data.nilai) {
      res.status(400).send('Pelamar Sudah Di Nilai');
    } else {
      const queryUpdate = { lowongan_id, pelamar_id };
      const updateDocumentDaftar = {
        $set: {
          status: 'Tahap1',
          nilai
        }
      };
      await Daftar.updateOne(queryUpdate, updateDocumentDaftar);
      res.status(200).send('Data Berhasil Update');
    }
  } catch (err) {
    console.log('Tidak Ditemukan');
  }
});

app.put('/delPelamar', async (req, res) => {
  const { pelamar_id, lowongan_id, nilai } = req.body;
  try {
    const queryUpdate = { lowongan_id, pelamar_id };
    const updateDocumentDaftar = {
      $set: {
        status: 'Tolak',
        nilai
      }
    };
    await Daftar.updateOne(queryUpdate, updateDocumentDaftar);

    //Delete Chat Pelamar
    const deleteMessenger = await Mesengger.deleteMany({ lowongan_id });

    res.status(200).send('Data Berhasil Ditolak');
  } catch (err) {
    console.log('Tidak Ditemukan');
  }
});

app.get('/jumlah-user', async (req, res) => {
  const { level } = req.query;
  try {
    const response = await User.find({ level });
    res.status(201).send(response);
  } catch (err) {
    res.status(400).send('Data Kosong');
  }
});

app.post('/add-divisi', async (req, res) => {
  const formData = req.body.formData;
  const generateId = uuidv4();
  const hasHeadPassword = await bcrypt.hash(formData.password, 10);

  try {
    const cekEmail = await User.findOne({ email: formData.email });
    if (cekEmail) {
      return res.status(401).send('Email Sudah Terdaftar');
    }

    const emailKecil = formData.email.toLowerCase();
    const data = {
      ...formData,
      user_id: generateId,
      email: emailKecil,
      password: hasHeadPassword,
      level: 'Divisi'
    };

    const response = await User.insertMany(data);
    res.status(201).send(response);
  } catch (err) {
    console.log(err);
  }
});

app.delete('/delete-divisi', async (req, res) => {
  const formData = req.query.formData;
  try {
    // await User.deleteOne({ user_id: formData.user_id });
    const lowongan = await Lowongan.find({ user_id: formData.user_id });

    const hapusDaftar = lowongan.map((item) => {
      return Daftar.deleteMany({ lowongan_id: item.lowongan_id });
    });

    const hapusLowongan = lowongan.map((item) => {
      return Lowongan.deleteOne({ lowongan_id: item.lowongan_id });
    });

    await Promise.all(hapusDaftar);
    await Promise.all(hapusLowongan);

    await Mesengger.deleteMany({
      $or: [{ from_userId: formData.user_id }, { to_userId: formData.user_id }]
    });

    await User.deleteOne({ user_id: formData.user_id });

    res.status(200).send('Data Berhasil Dihapus');
  } catch (err) {
    res.status(400).send('Data Tidak Dapat Dihapus');
  }
});

app.put('/edit-divisi', async (req, res) => {
  const { formData, emailLama } = req.body;

  if (emailLama === formData.email) {
    try {
      const query = { email: formData.email };
      const updateDivisi = {
        $set: {
          fullName: formData.fullName,
          gender: formData.gender,
          dobDay: formData.dobDay,
          dobMount: formData.dobMount,
          dobYear: formData.dobYear,
          divisi: formData.divisi,
          noHp: formData.noHp,
          about: formData.about,
          url: formData.url
        }
      };
      const response = await User.updateOne(query, updateDivisi);
      res.status(200).send('Data Berhasil Di Ubah');
    } catch (err) {
      res.status(400).send('Data Gagal Di Ubah');
    }
  } else {
    const email = await User.findOne({ email: formData.email });
    if (email) {
      res.status(400).send('Email Baru Sudah Ada');
    } else {
      try {
        const query = { email: emailLama };
        const updateDivisi = {
          $set: {
            email: formData.email,
            fullName: formData.fullName,
            gender: formData.gender,
            dobDay: formData.dobDay,
            dobMount: formData.dobMount,
            dobYear: formData.dobYear,
            divisi: formData.divisi,
            noHp: formData.noHp,
            about: formData.about,
            url: formData.url
          }
        };

        const response = await User.updateOne(query, updateDivisi);
        res.status(200).send('Data Berhasil Di Ubah');
      } catch (err) {
        res.status(400).send('Data Gagal Di Ubah');
      }
    }
  }
});

app.get('/getLowongan', async (req, res) => {
  const divisi = req.query.divisi;
  try {
    const data = await Lowongan.find({ divisi });
    const dataOlah = data.map((item) => {
      const dataWaktu = new Date(
        `${item.waktuLowongan.dobMount} ${item.waktuLowongan.dobDay}, ${item.waktuLowongan.dobYear}`
      );
      const tanggalBulanTahun = dataWaktu.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      return {
        lowongan_id: item.lowongan_id,
        pekerjaan: item.pekerjaan,
        batasPelamar: item.batasPelamar,
        waktuLowongan: tanggalBulanTahun,
        gender: item.gender
      };
    });
    const dataAsli = await Promise.all(dataOlah);
    res.status(201).send(dataAsli);
  } catch (err) {
    console.log(err);
  }
});

app.get('/get-lowongan-card', async (req, res) => {
  const { lowongan_id } = req.query;
  try {
    const response = await Lowongan.findOne({ lowongan_id });
    res.status(201).send(response);
  } catch (err) {
    res.status(400).send('Data Lowongan Tidak Ada');
  }
});

app.delete('/del-lowongan', async (req, res) => {
  const { lowongan_id } = req.query;
  try {
    const daftar = await Daftar.deleteMany({ lowongan_id });
    const lowongan = await Lowongan.deleteOne({ lowongan_id });
    res.status(200).send('Data Berhasil Di Hapus');
  } catch (err) {
    res.status(400).send('Data Gagal Di Hapus');
  }
});

app.get('/get-daftar-admin', async (req, res) => {
  try {
    const daftar = await Daftar.find();
    const response = daftar.map((item) => {
      return Lowongan.findOne({ lowongan_id: item.lowongan_id });
    });

    const lowongan = await Promise.all(response);

    res.status(201).send(lowongan);
  } catch (err) {
    res.status(400).send('Daftar Kosong');
  }
});

app.get('/getPelamar', async (req, res) => {
  const { lowongan_id, status } = req.query;
  try {
    const query = { lowongan_id, status };
    const daftar = await Daftar.find(query);
    const response = daftar.map((item) => {
      return User.findOne({ user_id: item.pelamar_id });
    });
    const pelamar = await Promise.all(response);
    res.status(200).send(pelamar);
  } catch (err) {
    res.status(400).send('Tidak Ada Mendaftar');
  }
});

app.put('/update-lowongan', async (req, res) => {
  const { formData, skill } = req.body;
  const bulan = new Date(
    formData.waktuLowongan.dobYear,
    formData.waktuLowongan.dobMount - 1,
    1
  ).toLocaleString('default', { month: 'long' });
  let gender = Object.keys(formData.gender).length;
  let genderPasti = '';
  if (
    gender === 2 &&
    formData.gender.man !== '' &&
    formData.gender.woman !== ''
  ) {
    genderPasti = 'More';
  } else if (
    gender === 2 &&
    formData.gender.man !== '' &&
    formData.gender.woman === ''
  ) {
    genderPasti = 'Man';
  } else if (
    gender === 2 &&
    formData.gender.man === '' &&
    formData.gender.woman !== ''
  ) {
    genderPasti = 'Woman';
  } else if (
    gender !== 2 &&
    formData.gender.man !== '' &&
    !formData.gender.woman
  ) {
    genderPasti = 'Man';
  } else if (gender !== 2 && formData.gender.woman !== '') {
    genderPasti = 'Woman';
  }
  try {
    const query = { lowongan_id: formData.lowongan_id };
    const updateDocument = {
      $set: {
        ...formData,
        skill,
        gender: genderPasti,
        waktuLowongan: { ...formData.waktuLowongan, dobMount: bulan }
      }
    };

    const response = await Lowongan.updateOne(query, updateDocument);
    res.status(201).send('Data Berhasil Update');
  } catch (err) {
    res.status(400).send('Lowongan gagal di Update');
  }
});

app.delete('/delPelamarAdmin', async (req, res) => {
  const { user_id, lowongan_id } = req.query;

  try {
    const query = { pelamar_id: user_id, lowongan_id };
    await Daftar.deleteOne(query);
    await Mesengger.deleteMany({
      $or: [{ from_userId: user_id }, { to_userId: user_id }]
    });
    res.status(200).send('Pelamar Berhasil Di Hapus');
  } catch (err) {
    res.status(400).send('Data Gagal Di Hapus');
  }
});

app.get('/getJumlah', async (req, res) => {
  const { lowongan } = req.query;

  try {
    const promise = lowongan.map((item) => {
      return Daftar.find({ lowongan_id: item.lowongan_id });
    });

    const daftar = await Promise.all(promise);

    let jumlahPelamar = 0;
    let jumlahTerima = 0;
    let jumlahTolak = 0;

    daftar.forEach((item) => {
      if (item.length > 0) {
        item.forEach((itemSub) => {
          jumlahPelamar++;
          if (itemSub.status === 'Terima') jumlahTerima++;
          if (itemSub.status === 'Tolak') jumlahTolak++;
        });
      }
    });

    const data = {
      jumlahTerima,
      jumlahTolak,
      jumlahPelamar
    };

    res.status(200).send(data);
  } catch (err) {
    res.status(400).send('Data Gagal Load');
  }
});

app.get('/get-daftar-divisi', async (req, res) => {
  const { lowongan_id, sorting, sortingNama, huruf, angka } = req.query;
  const sortingNilai = sorting === 'false';
  const sortingName = sortingNama === 'false';
  const nilaiAngka = angka === 'true';
  const nilaiHuruf = huruf === 'true';

  const data = [];
  try {
    const response = await Daftar.find({
      lowongan_id,
      $or: [{ status: 'Tahap1' }, { status: 'Terima' }, { status: 'Tolak' }]
    });
    const promise = response.map((item) => {
      return User.findOne({ user_id: item.pelamar_id });
    });

    const pelamar = await Promise.all(promise);

    response.map((item, i) => {
      const nilaiPengetahuan = parseInt(item.nilai.nilaiPengetahuan);
      const nilaiDisiplin = parseInt(item.nilai.nilaiDisiplin);
      const nilaiKreatifitas = parseInt(item.nilai.nilaiKreatifitas);
      if (item.pelamar_id === pelamar[i].user_id) {
        const promise = {
          ...item._doc,
          name: pelamar[i].fullName,
          rataRata: (
            (nilaiPengetahuan + nilaiDisiplin + nilaiKreatifitas) /
            3
          ).toFixed(2)
        };
        data.push(promise);
      }
    });

    let dataFix;

    if (nilaiHuruf) {
      dataFix = sortingName
        ? data.sort((itemA, itemB) => itemA.name.localeCompare(itemB.name))
        : data.sort((itemA, itemB) => itemB.name.localeCompare(itemA.name));
    }

    if (nilaiAngka) {
      dataFix = sortingNilai
        ? data.sort((nilaiA, nilaiB) => nilaiB.rataRata - nilaiA.rataRata)
        : data.sort((nilaiA, nilaiB) => nilaiA.rataRata - nilaiB.rataRata);
    }

    res.status(200).send(dataFix);
  } catch (err) {
    res.status(400).send('Data Gagal di Load');
  }
});

app.put('/proses-pelamar', async (req, res) => {
  const { penampung } = req.body;
  const lowongan_id = penampung[0].lowongan_id;

  const sorting = penampung.sort(
    (nilaiA, nilaiB) => nilaiB.rataRata - nilaiA.rataRata
  );

  const datapelamar = sorting.map((item, i) => {
    return item;
  });

  try {
    const updateDocumentTerima = {
      $set: {
        status: 'Terima'
      }
    };
    const updateDocumentTolak = {
      $set: {
        status: 'Tolak'
      }
    };

    const updateDocumentKetersedian = {
      $set: {
        ketersedian: 'Non-aktif'
      }
    };

    // const promise1 = dataPas.map((item) => {
    //   return Daftar.updateOne(
    //     {
    //       pelamar_id: item.pelamar_id,
    //       lowongan_id: item.lowongan_id,
    //       status: 'Tahap1'
    //     },
    //     updateDocumentTerima
    //   );
    // });

    const promise2 = datapelamar.map((item) => {
      return Daftar.updateOne(
        {
          pelamar_id: item.pelamar_id,
          lowongan_id: item.lowongan_id,
          status: 'Tahap1'
        },
        updateDocumentTolak
      );
    });

    // await Promise.all(promise1);
    await Promise.all(promise2);

    await Lowongan.updateOne({ lowongan_id }, updateDocumentKetersedian);

    res.status(200).send('Data Berhasil Update');
  } catch (err) {
    res.status(400).send(err);
  }
});

app.put('/status', async (req, res) => {
  const { item, value } = req.body;
  try {
    const query = {
      daftar_id: item.daftar_id
    };

    const updateDocument = {
      $set: {
        status: value
      }
    };

    await Daftar.updateOne(query, updateDocument);
    res.status(200).send(`Data Berhasil di ${value}`);
  } catch (err) {
    res.status(400).send('Data Gagal Update');
  }
});

// Lowongan Untuk Card Info Admin

// Trouble Data Dari Monggo
app.get('/tes', async (req, res) => {
  try {
    const lowongan = await User.find();
    res.send(lowongan);
  } catch (err) {
    console.log(err);
  }
});

app.listen(PORT, () => console.log(`Server Berjalan pada Port : ${PORT} `));
