import { authInputSchema } from '#shared/dto/auth'
import { User, type UserModel } from '#shared/models'
import bcrypt from 'bcryptjs'
import type { EventHandlerRequest, H3Event } from 'h3'
import { readValidatedBody } from 'h3'
import { Model } from 'mongoose'
import { apiError, getCurrentUser, signSessionToken } from '../../utils'

export class AuthController {
  private userModel: Model<UserModel>

  constructor() {
    this.userModel = User
  }
  public getCurrentUser = async (
    e: H3Event<EventHandlerRequest>,
  ): Promise<UserModel> => {
    return await getCurrentUser(e)
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
    return { accessToken: signSessionToken(user) }
  }
}
