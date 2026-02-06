import { Schema, model, type HydratedDocument, type Types } from 'mongoose'
import { PostModel } from './post.model'
import { UserModel } from './user.model'

const modelName: string = 'comment'

export interface CommentModel {
  _id: Types.ObjectId
  text: string
  author: Schema.Types.ObjectId
  post: Schema.Types.ObjectId
  date: Date
}

export interface PopulatedCommentModel {
  _id: Types.ObjectId
  text: string
  author: UserModel
  post: PostModel
  date: Date
}

export type CommentDocument = HydratedDocument<CommentModel>

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

export const Comment = model<CommentModel>(modelName, commentSchema)
