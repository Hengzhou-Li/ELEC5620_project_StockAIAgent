import mongoose, { Schema, Document, Model } from 'mongoose';

export type MessageRole = 'user' | 'model';

export interface MessageDocument extends Document {
  conversation: mongoose.Types.ObjectId;
  role: MessageRole;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<MessageDocument>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    role: { type: String, enum: ['user', 'model'], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

const Message: Model<MessageDocument> =
  (mongoose.models.Message as Model<MessageDocument>) ||
  mongoose.model<MessageDocument>('Message', MessageSchema);

export default Message;

