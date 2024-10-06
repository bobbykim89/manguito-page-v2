import { Schema, model, type Document, type Types } from 'mongoose'

const modelName: string = 'user'

export type UserRoleType = 'ADMIN' | 'MANAGER' | 'USER'

export interface UserModel extends Document {
  _id: Types.ObjectId
  name: string
  email: string
  password: string
  role: UserRoleType
  date: Date
  updatedAt: Date
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
  role: {
    type: String,
    default: 'USER',
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

export const User = model<UserModel>(modelName, userSchema)
