import { useRuntimeConfig } from '#imports'
import { User, type UserModel } from '@/server/models'
import { type RuntimeConfig } from '@nuxt/schema'
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
import type { Model } from 'mongoose'
import {
  newUsernameInputSchema,
  pwUpdateInputSchema,
  setAdminInputSchema,
  setUserRoleInputSchema,
  userInputSchema,
} from './dto'

export class UserController {
  private config: RuntimeConfig
  private userModel: Model<UserModel>

  constructor() {
    this.config = useRuntimeConfig()
    this.userModel = User
  }
  public signupUser = async (e: H3Event<EventHandlerRequest>) => {
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
    await this.checkUniqueUsername(name)
    user = new this.userModel({
      name,
      email,
      password,
    })

    user.password = await this.hashPassword(password)
    await user.save()
    const payload = {
      id: user.id,
    }
    // set access token
    const accessToken = this.signToken(payload)
    const status = getResponseStatus(e)
    const text = getResponseStatusText(e)

    return {
      status,
      message: text,
      access_token: `Bearer ${accessToken}`,
    }
  }
  public updatePassword = async (e: H3Event<EventHandlerRequest>) => {
    const user = await this.getRawCurrentUserData(e.context)
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
  public updateUsername = async (
    e: H3Event<EventHandlerRequest>
  ): Promise<UserModel> => {
    const user = await this.getRawCurrentUserData(e.context)
    const { username } = await readValidatedBody(
      e,
      newUsernameInputSchema.parse
    )
    await this.checkUniqueUsername(username)
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
  public setAdmin = async (
    e: H3Event<EventHandlerRequest>
  ): Promise<UserModel> => {
    const user = await this.getRawCurrentUserData(e.context)
    const { phrase } = await readValidatedBody(e, setAdminInputSchema.parse)
    if (phrase !== this.config.adminSecretPhrase) {
      throw createError({
        status: 403,
        message: 'Forbidden',
        statusMessage: 'Access denied.',
      })
    }
    const existingAdmins = await this.userModel
      .find({ role: 'ADMIN' })
      .select('-password')
    if (existingAdmins.length > 0) {
      throw createError({
        status: 403,
        message: 'Forbidden',
        statusMessage: 'Access denied: admin already exists.',
      })
    }
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        user.id,
        { role: 'ADMIN' },
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
  public getUserList = async (
    e: H3Event<EventHandlerRequest>
  ): Promise<UserModel[]> => {
    const currentUser = await this.getRawCurrentUserData(e.context)
    if (currentUser.role !== 'ADMIN') {
      throw createError({
        status: 401,
        message: 'Access denied',
        statusMessage: 'Access denied: only admin has access to user info.',
      })
    }
    const allUser = await this.userModel
      .find({ role: { $ne: 'ADMIN' } })
      .select('-password')
    if (!allUser) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'Users not found',
      })
    }
    return allUser
  }
  public setUserRole = async (
    e: H3Event<EventHandlerRequest>
  ): Promise<UserModel> => {
    const userId = getRouterParam(e, 'id')
    const user = await this.getRawCurrentUserData(e.context)
    if (user.role !== 'ADMIN') {
      throw createError({
        status: 401,
        message: 'Access denied',
        statusMessage: 'Access denied: only admin has access to user info.',
      })
    }
    const { role } = await readValidatedBody(e, setUserRoleInputSchema.parse)
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { role, updatedAt: new Date() },
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
  public hashPassword = async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
    return hashedPassword
  }
  private checkUniqueUsername = async (username: string): Promise<void> => {
    const user = await this.userModel
      .find({ name: username })
      .select('-password')
    if (user.length > 0) {
      throw createError({
        status: 400,
        message: 'Bad Request',
        statusMessage: `Bad Request: username '${username}' is already in use, please use different username`,
      })
    }
  }
  public getRawCurrentUserData = async (
    ctx: H3EventContext
  ): Promise<UserModel> => {
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
  public getCurrentUserData = async (
    ctx: H3EventContext
  ): Promise<UserModel> => {
    const user = await this.userModel.findById(ctx.user.id).select('-password')
    if (!user) {
      throw createError({
        status: 404,
        message: 'Not Found',
        statusMessage: 'Access denied: user not found',
      })
    }
    return user
  }
  public signToken = (payload: { id: string }) => {
    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: '7d',
    })
  }
}
