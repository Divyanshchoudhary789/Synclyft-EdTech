const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

// Atomic, monotonic sequence used for invoice numbers. findOneAndUpdate with
// $inc + upsert guarantees no two invoices get the same number, even under
// concurrent requests (unlike countDocuments() which can race). Pass `session`
// when called inside a database transaction.
counterSchema.statics.getNextSequence = function (name, session) {
  return this.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
};

module.exports = mongoose.model('Counter', counterSchema);
