import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price_hour: {
    type: Number,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ["male", "female", "trans"],
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  nationality: {
    type: String,
    required: true
  },
  ad_id: {
    type: Number
  },
  published_date: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String
  }
},
{
  timestamps: true, // This will create `createdAt` and `updatedAt` fields
});

const User = mongoose.model("User", UserSchema);

export default User;