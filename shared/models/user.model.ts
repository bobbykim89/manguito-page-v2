import { HydratedDocument, Schema, model, type Types } from 'mongoose'
import { LIMITS } from '../dto/limits'

const modelName: string = 'user'

export type UserRoleType = 'ADMIN' | 'MANAGER' | 'USER'

export interface UserModel {
  _id: Types.ObjectId
  name: string
  email: string
  password: string
  role: UserRoleType
  date: Date
  updatedAt: Date
  /** Bumped by an email password reset; tokens signed with another value are dead. */
  tokenVersion: number
}

export type UserDocument = HydratedDocument<UserModel>

const userSchema: Schema<UserModel> = new Schema<UserModel>(
  {
    name: {
      type: String,
      required: true,
      // exact match, as typed; checkUniqueUsername gives the friendly message
      unique: true,
      maxlength: LIMITS.username,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: LIMITS.email,
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
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    toJSON: {
      // never send these to the client
      transform: (_doc, ret: Partial<UserModel>) => {
        delete ret.password
        delete ret.tokenVersion
        return ret
      },
    },
  },
)

export const User = model<UserModel>(modelName, userSchema)
