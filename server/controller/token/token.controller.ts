import { resetPwInputSchema, tokenEmailInputSchema } from '#shared/dto/token'
import { Token, type TokenModel, User, type UserModel } from '#shared/models'
import type { EventHandlerRequest, H3Event } from 'h3'
import { createError, getRequestURL, readValidatedBody } from 'h3'
import { Model } from 'mongoose'
import { createResetToken, digestResetToken, sendEmail } from '../../utils'
import { UserController } from '../user/user.controller'

// Same answer whether or not the email has an account.
const RESET_REQUESTED = {
  message: "If that email has an account, we've sent a reset link.",
}

export class TokenController {
  private tokenModel: Model<TokenModel>
  private userModel: Model<UserModel>
  private userController: UserController
  constructor() {
    this.tokenModel = Token
    this.userModel = User
    this.userController = new UserController()
  }
  public sentToken = async (e: H3Event<EventHandlerRequest>) => {
    const { email } = await readValidatedBody(e, tokenEmailInputSchema.parse)
    const user = await this.userModel.findOne({ email })
    if (!user) return RESET_REQUESTED

    // a new request replaces any earlier link
    await this.tokenModel.deleteMany({ userId: user._id })
    const { token, digest } = createResetToken()
    await new this.tokenModel({ userId: user._id, token: digest }).save()

    // The link points at the host this request reached. Never take it from
    // the body or X-Forwarded-Host, or anyone could send a real token to their
    // own site. The scheme comes from the proxy (Vercel terminates HTTPS).
    const origin = getRequestURL(e, { xForwardedProto: true }).origin
    const link = `${origin}/auth/reset-password?user=${user.id}&token=${token}`

    const message: string = `Dear ${user.name},\n\nWe received a request to reset your password. To proceed with resetting your password, please click the link below:\n${link} \n\nThis link will be active for the next 60 minutes. After that, you will need to request a new link if you still wish to reset your password.\nIf you did not request a password reset, you can safely ignore this email.\n\nThank you,\nBobby Kim`
    await sendEmail(user.email, 'Password Reset Request', message)

    return RESET_REQUESTED
  }
  public resetPasswordWithToken = async (e: H3Event<EventHandlerRequest>) => {
    const { password, token, userId } = await readValidatedBody(
      e,
      resetPwInputSchema.parse,
    )
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw createError({
        status: 400,
        message: 'Not Found',
        statusMessage: 'Not Found: User not found.',
      })
    }
    const pwResetToken = await this.tokenModel.findOne({
      userId,
      token: digestResetToken(token),
    })
    if (!pwResetToken) {
      throw createError({
        status: 400,
        message: 'Not Found',
        statusMessage: 'Not Found: Token not found.',
      })
    }
    const hashedPassword = await this.userController.hashPassword(password)
    user.password = hashedPassword
    await user.save()
    await pwResetToken.deleteOne()
    return null
  }
}
