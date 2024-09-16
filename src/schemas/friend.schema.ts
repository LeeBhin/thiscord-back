import { Schema } from 'mongoose';

export const FriendSchema = new Schema({
  userid: { type: String, required: true },
  friends: [
    {
      friendid: { type: String, required: true },
      status: { type: String, enum: ['pending', 'accepted', 'blocked'], default: 'pending' },
      who: { type: String },
      createdat: { type: Date, default: Date.now },
    },
  ],
});
