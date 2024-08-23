import { Document, Schema, model } from 'mongoose'

const modelName: string = 'user'

export interface UserModel extends Document {
  name: string
  email: string
  password: string
  admin: boolean
  date: Date
}

const userSchema: Schema<UserModel> = new Schema<UserModel>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  admin: {
    type: Boolean,
    default: false,
  },
  date: {
    type: Date,
    default: Date.now,
  },
})

export const User = model<UserModel>(modelName, userSchema)
