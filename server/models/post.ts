import { Schema, model, Document, Model } from 'mongoose'

const modelName: string = 'post'

export interface PostModel extends Document {
  content: string
  image: string
  imageId: string
  name: string
  author: Schema.Types.ObjectId
  date: Date
}

const postSchema: Schema<PostModel> = new Schema<PostModel>({
  content: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  imageId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  date: {
    type: Date,
    default: Date.now,
  },
})

export const Post: Model<PostModel> = model(modelName, postSchema)
