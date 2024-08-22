import { Schema, model, Document, Model } from 'mongoose'

const modelName: string = 'post'

export interface PostModel extends Document {
  content: string
  imageId: string
  author: Schema.Types.ObjectId
  date: Date
  updatedAt: Date
}

const postSchema: Schema<PostModel> = new Schema<PostModel>({
  content: {
    type: String,
    required: true,
  },
  imageId: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

export const Post: Model<PostModel> = model(modelName, postSchema)
