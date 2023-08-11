const mongoose = require('mongoose');

const Daftar = mongoose.model('daftar', {
  daftar_id: {
    type: String,
    required: true
  },
  pelamar_id: {
    type: String,
    required: true
  },
  lowongan_id: {
    type: String,
    required: true
  },
  tanggalDaftar: {
    type: String,
    required: true
  },
  status: {
    type: String
  },
  nilai: {
    type: Object
  }
});

module.exports = Daftar;
