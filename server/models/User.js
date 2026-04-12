const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // ── Common fields ──────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned in queries by default
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, 'Phone must be exactly 10 digits'],
    },
    address: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['Citizen', 'Collector', 'GreenChampion'],
      required: [true, 'Role is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Citizen-specific ───────────────────────────────────────────
    pickupRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PickupRequest',
      },
    ],

    // ── Collector-specific ─────────────────────────────────────────
    collectorId: {
      type: String,
      trim: true,
      sparse: true, // allows null but enforces uniqueness when set
      unique: true,
    },
    assignedAreas: [
      {
        type: String,
        trim: true,
      },
    ],

    // ── GreenChampion-specific ─────────────────────────────────────
    locality: {
      type: String,
      trim: true,
    },
    campaigns: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
      },
    ],
    rewards: {
      points: { type: Number, default: 0 },
      badges: [{ type: String }],
    },
    ecoPoints:      { type: Number, default: 0 },
    badges:         [{ type: String }],
    profilePhoto:   { type: String, default: '' },
    streakCount:    { type: Number, default: 0 },
    lastActiveDate: { type: Date,   default: null },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ── Hash password before save ──────────────────────────────────────
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Instance method: compare password ─────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ── Remove sensitive fields from JSON output ───────────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
