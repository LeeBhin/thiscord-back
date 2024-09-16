import { Document } from 'mongoose';

export interface Friend extends Document {
  readonly userid: string;
  readonly friends: {
    friendid: string;
    status: string;
    who: string;
    createdat: Date;
  }[];
}
