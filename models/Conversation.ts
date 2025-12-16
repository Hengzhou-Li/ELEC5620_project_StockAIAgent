import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ConversationDocument extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<ConversationDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
  },
  { timestamps: true }
);

const Conversation: Model<ConversationDocument> =
  (mongoose.models.Conversation as Model<ConversationDocument>) ||
  mongoose.model<ConversationDocument>('Conversation', ConversationSchema);

export default Conversation;

