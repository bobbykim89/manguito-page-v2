import { Schema, model, type HydratedDocument, type Types } from 'mongoose'
import { LIMITS } from '../dto/limits'

const modelName: string = 'comment'

export interface CommentModel {
  _id: Types.ObjectId
  text: string
  author: Types.ObjectId
  post: Types.ObjectId
  date: Date
}

export type CommentDocument = HydratedDocument<CommentModel>

const commentSchema: Schema<CommentModel> = new Schema<CommentModel>({
  text: {
    type: String,
    required: true,
    maxlength: LIMITS.comment,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'user',
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: 'post',
    // comments by post, and the cascade when a post is deleted
    index: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
})

export const Comment = model<CommentModel>(modelName, commentSchema)

// autoIndex builds indexes in the background and swallows a failure (e.g. a
// duplicate blocking a unique index); log it so it shows in the server logs
Comment.on('index', (err?: Error) => {
  if (err) console.error('[comment] index build failed:', err)
})
