const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
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
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\d{10}$/, 'Phone must be exactly 10 digits'],
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
    isVerified: {
      type: Boolean,
      default: true,
    },
    village: {
      type: String,
      trim: true,
      default: '',
    },
    pickupRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PickupRequest',
      },
    ],
    collectorId: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
    assignedAreas: [
      {
        type: String,
        trim: true,
      },
    ],
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
    timestamps: true,
  }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  // Handle legacy plain-text passwords (e.g. manually inserted via DB tools)
  const isBcrypt = this.password && this.password.startsWith('$2');
  if (!isBcrypt) {
    if (enteredPassword !== this.password) return false;
    // Re-hash and save so future logins use bcrypt
    // Directly set the hashed value to avoid double-hashing via pre('save')
    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(enteredPassword, salt);
    await this.constructor.updateOne({ _id: this._id }, { password: hashed });
    return true;
  }
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);