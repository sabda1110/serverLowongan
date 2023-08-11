const mongoose = require('mongoose');

const Mesengger = mongoose.model('mesengger', {
  timeStamp: {
    type: String,
    required: true
  },
  from_userId: {
    type: String,
    required: true
  },
  to_userId: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  lowongan_id: {
    type: String
  },
  status: {
    type: String
  }
});

module.exports = Mesengger;
