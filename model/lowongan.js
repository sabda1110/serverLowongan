const mongoose = require('mongoose');

//Schema Lowongan

const Lowongan = mongoose.model('lowongan', {
  lowongan_id: {
    type: String,
    required: true
  },
  pekerjaan: {
    type: String,
    required: true
  },
  descPekerjaan: {
    type: String,
    required: true
  },
  waktuLowongan: {
    dobDay: {
      type: String,
      required: true
    },
    dobMount: {
      type: String,
      required: true
    },
    dobYear: {
      type: String,
      required: true
    }
  },
  ketersedian: {
    type: String
  },
  divisi: {
    type: String,
    required: true
  },
  pendidikan: {
    type: String,
    required: true
  },
  skill: {
    type: Object
  },
  user_id: {
    type: String,
    required: true
  },
  gender: {
    type: String
  },
  pelamar: {
    type: Object
  }
});

module.exports = Lowongan;
