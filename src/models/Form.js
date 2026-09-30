const mongoose = require("mongoose");
const { bilingualSchema } = require("./schemas/common");
const { apiJson } = require("./plugins/apiJson");

const QUESTION_TYPES = ["text", "textarea", "radio", "checkbox", "select", "rating"];
const INPUT_TYPES = ["text", "email", "tel", "number"];

const optionSchema = new mongoose.Schema(
  {
    label: { type: bilingualSchema, default: () => ({ en: "", kn: "" }) },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: QUESTION_TYPES },
    inputType: { type: String, enum: INPUT_TYPES, default: "text" },
    label: { type: bilingualSchema, default: () => ({ en: "", kn: "" }) },
    helpText: { type: bilingualSchema, default: () => ({ en: "", kn: "" }) },
    required: { type: Boolean, default: false },
    options: { type: [optionSchema], default: [] },
  },
  { _id: false }
);

const formSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 1,
      maxlength: 80,
    },
    title: { type: bilingualSchema, default: () => ({ en: "", kn: "" }) },
    description: { type: bilingualSchema, default: () => ({ en: "", kn: "" }) },
    isActive: { type: Boolean, default: true },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true }
);

formSchema.index({ createdAt: -1 });
apiJson(formSchema, { keepTimestamps: true });

module.exports = mongoose.model("Form", formSchema);
