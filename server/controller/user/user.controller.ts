import { type RuntimeConfig } from '@nuxt/schema'
import { useRuntimeConfig } from '#imports'
import { User, type UserModel } from '@/server/models'
import { Model } from 'mongoose'
import bcrypt from 'bcryptjs'
import type { EventHandlerRequest, H3Event, H3EventContext } from 'h3'
import {
  createError,
  getResponseStatus,
  getResponseStatusText,
  readValidatedBody,
  setResponseStatus,
} from 'h3'
import jwt from 'jsonwebtoken'
import {
  userInputSchema,
  pwUpdateInputSchema,
  newUsernameInputSchema,
  setAdminInputSchema,
} from './dto'

export class UserController {
  config: RuntimeConfig
  userModel: Model<UserModel>

  constructor() {
    this.config = useRuntimeConfig()
    this.userModel = User
  }
  public async signupUser(e: H3Event<EventHandlerRequest>) {
    // validate body
    const { name, email, password } = await readValidatedBody(
      e,
      userInputSchema.parse
    )
    let user = await this.userModel.findOne({ email })
    if (user) {
      throw createError({
        status: 400,
        message: 'Bad Request',
        statusMessage:
          'Bad Request: following email address is already in use, please use different email address',
      })
    }
    user = new this.userModel({
      name,
      email,
      password,
    })

    user.password = await this.hashPassword(password)
    await user.save()
    const payload = {
      id: user.id,
      admin: user.admin,
    }
    // set access token
    const accessToken = jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: '7d',
    })
    const status = getResponseStatus(e)
    const text = getResponseStatusText(e)

    return {
      status,
      message: text,
      access_token: `Bearer ${accessToken}`,
    }
  }
  public async updatePassword(e: H3Event<EventHandlerRequest>) {
    const user = await this.checkCurrentUser(e.context)
    // validate body
    const { currentPassword, newPassword } = await readValidatedBody(
      e,
      pwUpdateInputSchema.parse
    )
    // check if current password matches
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      throw createError({
        status: 403,
        message: 'Validation error',
        statusMessage: 'Invalid credential: please check your password again',
      })
    }
    const hashedNewPw = await this.hashPassword(newPassword)
    const updatedUser = await this.userModel.findByIdAndUpdate(
      user.id,
      { password: hashedNewPw },
      { new: true, returnDocument: 'after' }
    )
    if (!updatedUser) {
      throw createError({
        status: 500,
        message: 'Server error',
        statusMessage: 'Unexpected error occurred, please try again.',
      })
    }
    setResponseStatus(e, 200, 'Successfully updated user password')
    const status = getResponseStatus(e)
    const text = getResponseStatusText(e)

    return {
      status,
      message: text,
    }
  }
  public async updateUsername(
    e: H3Event<EventHandlerRequest>
  ): Promise<UserModel> {
    const user = await this.checkCurrentUser(e.context)
    const { username } = await readValidatedBody(
      e,
      newUsernameInputSchema.parse
    )
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        user.id,
        { name: username },
        { new: true, returnDocument: 'after' }
      )
      .select('-password')
    if (!updatedUser) {
      throw createError({
        status: 500,
        message: 'Server error',
        statusMessage: 'Unexpected error occurred, please try again.',
      })
    }
    return updatedUser
  }
  public async setAdmin(e: H3Event<EventHandlerRequest>): Promise<UserModel> {
    const user = await this.checkCurrentUser(e.context)
    const { phrase } = await readValidatedBody(e, setAdminInputSchema.parse)
    if (phrase !== this.config.adminSecretPhrase) {
      throw createError({
        status: 403,
        message: 'Forbidden',
        statusMessage: 'Access denie.',
      })
    }
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        user.id,
        { admin: true },
        { new: true, returnDocument: 'after' }
      )
      .select('-password')
    if (!updatedUser) {
      throw createError({
        status: 500,
        message: 'Server error',
        statusMessage: 'Unexpected error occurred, please try again.',
      })
    }
    return updatedUser
  }
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    return hashedPassword
  }
  private async checkCurrentUser(ctx: H3EventContext): Promise<UserModel> {
    const user = await this.userModel.findById(ctx.user.id)
    if (!user) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'User not found',
      })
    }
    return user
  }
}
