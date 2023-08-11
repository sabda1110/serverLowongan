const mongoose = require('mongoose');

//Membuat Schema
const Pelamar = mongoose.model('pelamar', {
  user_id: { type: String, required: true },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String
  },
  email: {
    type: String
  },
  gender: { type: String },
  dobDay: { type: String },
  dobMount: { type: String },
  dobYear: { type: String },
  divisi: { type: String },
  noHp: { type: String },
  pendidikan: {
    sd: { type: String },
    smp: { type: String },
    smk: { type: String },
    sarjana: { type: String }
  },
  riwayatPekerjaan: {
    pekerjaanPertama: { type: String },
    pekerjaanKedua: { type: String }
  },
  about: { type: String },
  url: { type: String },
  matches: { type: Object },
  level: { type: String },
  skill: {
    skillPertama: { type: String },
    skillKedua: { type: String },
    skillKetiga: { type: String },
    skillEmpat: { type: String }
  }
});

module.exports = Pelamar;
