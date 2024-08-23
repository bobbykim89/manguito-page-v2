import { type UserModel } from '@/server/models'
import bcrypt from 'bcryptjs'
import type { EventHandlerRequest, H3Event } from 'h3'
import {
  createError,
  getResponseStatus,
  getResponseStatusText,
  readValidatedBody,
  setResponseStatus,
} from 'h3'
import { Model } from 'mongoose'
import { UserController } from '../user/user.controller'
import { authInputSchema } from './dto'

export class AuthController<T extends UserModel> {
  private userModel: Model<T>
  private userController: UserController<T>

  constructor(userModel: Model<T>) {
    this.userModel = userModel
    this.userController = new UserController(userModel)
  }
  public getCurrentUser = async (
    e: H3Event<EventHandlerRequest>
  ): Promise<T> => {
    const user = await this.userModel
      .findById(e.context.user.id)
      .select('-password')
    if (!user) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'User not found',
      })
    }
    return user
  }
  public loginUser = async (e: H3Event<EventHandlerRequest>) => {
    // validate body
    const { email, password } = await readValidatedBody(
      e,
      authInputSchema.parse
    )
    let user = await this.userModel.findOne({ email })
    if (!user) {
      throw createError({
        status: 403,
        message: 'Validation error',
        statusMessage:
          'Invalid credential: please check email or password again',
      })
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      throw createError({
        status: 403,
        message: 'Validation error',
        statusMessage:
          'Invalid credential: please check email or password again',
      })
    }
    const payload = {
      id: user.id,
    }
    const accessToken = this.userController.signToken(payload)

    setResponseStatus(e, 200, 'Login successful!')
    const status = getResponseStatus(e)
    const text = getResponseStatusText(e)

    return {
      status,
      message: text,
      access_token: `Bearer ${accessToken}`,
    }
  }
}
