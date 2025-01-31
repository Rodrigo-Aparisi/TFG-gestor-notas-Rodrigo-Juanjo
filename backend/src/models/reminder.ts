import mongoose, { Schema, Document } from 'mongoose';

export interface IReminder extends Document {
  userId: string;
  title: string;
  description: string;
  dateTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReminderSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  dateTime: { type: Date, required: true },
}, {
  timestamps: true
});

export const Reminder = mongoose.model<IReminder>('Reminder', ReminderSchema);
