import { Schema, model, Document, Model } from 'mongoose'

const modelName: string = 'comment'

export interface CommentModel extends Document {
  text: string
  author: Schema.Types.ObjectId
  post: Schema.Types.ObjectId
  date: Date
}

const commentSchema: Schema<CommentModel> = new Schema<CommentModel>({
  text: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: 'post',
  },
  date: {
    type: Date,
    default: Date.now,
  },
})

export const Comment: Model<CommentModel> = model(modelName, commentSchema)
