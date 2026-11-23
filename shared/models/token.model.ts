import { type HydratedDocument, model, Schema, type Types } from 'mongoose'

const modelName: string = 'token'

export interface TokenModel {
  _id: Types.ObjectId
  userId: Types.ObjectId
  token: string
  createdAt: Date
}

export type TokenDocument = HydratedDocument<TokenModel>

const tokenSchema = new Schema<TokenModel>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'user',
    // one live reset link per user
    unique: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600,
  },
})

export const Token = model<TokenModel>(modelName, tokenSchema)

// autoIndex builds indexes in the background and swallows a failure (e.g. a
// duplicate blocking a unique index); log it so it shows in the server logs
Token.on('index', (err?: Error) => {
  if (err) console.error('[token] index build failed:', err)
})
