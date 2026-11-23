import { resetPwInputSchema, tokenEmailInputSchema } from '#shared/dto/token'
import { Token, type TokenModel, User, type UserModel } from '#shared/models'
import type { EventHandlerRequest, H3Event } from 'h3'
import { getRequestURL, readValidatedBody } from 'h3'
import { Model } from 'mongoose'
import {
  apiError,
  createResetToken,
  digestResetToken,
  parseObjectId,
  sendEmail,
} from '../../utils'
import { UserController } from '../user/user.controller'

// Same answer whether or not the email has an account.
// One answer for a bad user id, an unknown user and a wrong or used token, so
// the endpoint doesn't say which user ids exist.
const badResetLink = () =>
  apiError('VALIDATION_FAILED', 'This reset link is invalid or has expired.')

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

    // A new request replaces any earlier link, in one step: with the unique
    // userId index, two requests at once still leave one token. Setting
    // createdAt restarts the hour on the TTL index.
    const { token, digest } = createResetToken()
    await this.tokenModel.findOneAndUpdate(
      { userId: user._id },
      { token: digest, createdAt: new Date() },
      { upsert: true },
    )

    // The link points at the host this request reached. Never take it from
    // the body or X-Forwarded-Host, or anyone could send a real token to their
    // own site. The scheme comes from the proxy (Vercel terminates HTTPS).
    // It trusts the Host header, which Vercel sets to the domain that was
    // reached; behind any other proxy, make sure Host can't be spoofed.
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
    let id
    try {
      id = parseObjectId(userId)
    } catch {
      throw badResetLink()
    }
    // Consume the token first, so a link used twice at once resets once.
    const pwResetToken = await this.tokenModel.findOneAndDelete({
      userId: id,
      token: digestResetToken(token),
    })
    if (!pwResetToken) throw badResetLink()
    const hashedPassword = await this.userController.hashPassword(password)
    // A new tokenVersion logs out every device that had a session.
    const result = await this.userModel.updateOne(
      { _id: id },
      { password: hashedPassword, $inc: { tokenVersion: 1 } },
    )
    if (result.matchedCount === 0) throw badResetLink()
    return null
  }
}
