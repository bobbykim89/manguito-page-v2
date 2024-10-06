import { model, Schema, type Document, type Types } from 'mongoose'

const modelName: string = 'token'

export interface TokenModel extends Document {
  _id: Types.ObjectId
  userId: Schema.Types.ObjectId
  token: string
  createdAt: Date
}

const tokenSchema = new Schema<TokenModel>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'user',
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
