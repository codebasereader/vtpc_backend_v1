const mongoose = require("mongoose");
const { apiJson } = require("./plugins/apiJson");

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, trim: true },
    question: { type: String, default: "" },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const formResponseSchema = new mongoose.Schema(
  {
    form: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true, index: true },
    answers: { type: [answerSchema], default: [] },
  },
  { timestamps: true }
);

formResponseSchema.index({ form: 1, createdAt: -1 });
apiJson(formResponseSchema, { keepTimestamps: true });

module.exports = mongoose.model("FormResponse", formResponseSchema);
