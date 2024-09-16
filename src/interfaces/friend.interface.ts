import { Document } from 'mongoose';

export interface Friend extends Document {
  userid: string;
  friends: {
    friendid: string;
    status: string;
    who: string;
    createdat: Date;
  }[];
}
