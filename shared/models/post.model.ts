import { Schema, model, type HydratedDocument, type Types } from 'mongoose'
import { UserModel } from './user.model'

const modelName: string = 'post'

export interface PostModel {
  _id: Types.ObjectId
  content: string
  imageId: string
  author: Types.ObjectId
  date: Date
  updatedAt: Date
}
export interface PopulatedPostModel {
  _id: Types.ObjectId
  content: string
  imageId: string
  author: UserModel
  date: Date
  updatedAt: Date
}

export type PostDocument = HydratedDocument<PostModel>

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

export const Post = model<PostModel>(modelName, postSchema)
