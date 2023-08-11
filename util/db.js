const mongoose = require('mongoose');
mongoose.connect(
  'mongodb+srv://octy:prh386wo82@cluster0.mxoowsj.mongodb.net/loker?retryWrites=true&w=majority',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
  }
);
