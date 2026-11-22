import { Schema, model, type HydratedDocument, type Types } from 'mongoose'
import { LIMITS } from '../dto/limits'

const modelName: string = 'post'

export interface PostModel {
  _id: Types.ObjectId
  content: string
  imageId: string
  author: Types.ObjectId
  date: Date
  updatedAt: Date
}
export type PostDocument = HydratedDocument<PostModel>

const postSchema: Schema<PostModel> = new Schema<PostModel>({
  content: {
    type: String,
    required: true,
    maxlength: LIMITS.caption,
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

// every list sorts by date, newest first
postSchema.index({ date: -1 })

export const Post = model<PostModel>(modelName, postSchema)
