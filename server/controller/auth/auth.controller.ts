import { authInputSchema } from '#shared/dto/auth'
import { User, type UserModel } from '#shared/models'
import bcrypt from 'bcryptjs'
import type { EventHandlerRequest, H3Event } from 'h3'
import { readValidatedBody } from 'h3'
import { Model } from 'mongoose'
import { apiError } from '../../utils'
import { UserController } from '../user/user.controller'

export class AuthController {
  private userModel: Model<UserModel>
  private userController: UserController

  constructor() {
    this.userModel = User
    this.userController = new UserController()
  }
  public getCurrentUser = async (
    e: H3Event<EventHandlerRequest>,
  ): Promise<UserModel> => {
    const user = await this.userModel
      .findById(e.context.user.id)
      .select('-password')
    if (!user) {
      throw apiError('UNAUTHENTICATED', 'Session expired, please log in again')
    }
    return user
  }
  public loginUser = async (e: H3Event<EventHandlerRequest>) => {
    // validate body
    const { email, password } = await readValidatedBody(
      e,
      authInputSchema.parse,
    )
    const user = await this.userModel.findOne({ email })
    if (!user) {
      throw apiError(
        'INVALID_CREDENTIALS',
        'Invalid credential: please check email or password again',
      )
    }
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      throw apiError(
        'INVALID_CREDENTIALS',
        'Invalid credential: please check email or password again',
      )
    }
    const payload = {
      id: user.id,
    }
    const accessToken = this.userController.signToken(payload)
    return { accessToken: `Bearer ${accessToken}` }
  }
}
