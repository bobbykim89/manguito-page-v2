import { Document, Schema, model } from 'mongoose'
import { PostModel } from './post'
import { UserModel } from './user'

const modelName: string = 'comment'

export interface CommentModel extends Document {
  text: string
  author: Schema.Types.ObjectId
  post: Schema.Types.ObjectId
  date: Date
}

export interface PopulatedCommentModel extends Document {
  text: string
  author: UserModel
  post: PostModel
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

export const Comment = model<CommentModel>(modelName, commentSchema)
