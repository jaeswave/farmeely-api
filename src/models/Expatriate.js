const mongoose = require("mongoose");

const expatriateSchema = new mongoose.Schema(
  {
    group_id: {
      type: String,
      required: true,
      unique: true,
    },
    group_name: {
      type: String,
      required: [true, "Group name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    country: {
      type: String,
      required: [true, "Country is required"],
    },
    group_type: {
      type: String,
      enum: ["expatriate", "social", "professional", "cultural"],
      default: "expatriate",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        user_email: String,
        user_name: String,
        joined_at: {
          type: Date,
          default: Date.now,
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
      },
    ],
    max_members: {
      type: Number,
      default: 50,
      min: 2,
    },
    is_public: {
      type: Boolean,
      default: true,
    },
    membership_approval: {
      type: Boolean,
      default: false, // If true, requires admin approval to join
    },
    tags: [String],
    status: {
      type: String,
      enum: ["active", "inactive", "full"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

// Update status based on member count
expatriateSchema.pre("save", function (next) {
  const currentMembers = this.members.length;
  if (currentMembers >= this.max_members) {
    this.status = "full";
  } else if (this.status === "full" && currentMembers < this.max_members) {
    this.status = "active";
  }
  next();
});

module.exports = mongoose.model("Expatriate", expatriateSchema);
