import { useRuntimeConfig } from '#imports'
import {
  newUsernameInputSchema,
  pwUpdateInputSchema,
  setAdminInputSchema,
  setUserRoleInputSchema,
  userInputSchema,
} from '#shared/dto/user'
import { User, type UserModel } from '#shared/models'
import { type RuntimeConfig } from '@nuxt/schema'
import bcrypt from 'bcryptjs'
import type { EventHandlerRequest, H3Event } from 'h3'
import { getRouterParam, readValidatedBody } from 'h3'
import type { Model } from 'mongoose'
import {
  apiError,
  getCurrentUser,
  parseObjectId,
  signSessionToken,
} from '../../utils'

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
      userInputSchema.parse,
    )
    let user = await this.userModel.findOne({ email })
    if (user) {
      throw apiError(
        'CONFLICT',
        'That email address is already in use, please use a different one.',
      )
    }
    await this.checkUniqueUsername(name)
    user = new this.userModel({
      name,
      email,
      password,
    })

    user.password = await this.hashPassword(password)
    await user.save()
    return { accessToken: signSessionToken(user) }
  }
  public updatePassword = async (e: H3Event<EventHandlerRequest>) => {
    const user = await getCurrentUser(e)
    // validate body
    const { currentPassword, newPassword } = await readValidatedBody(
      e,
      pwUpdateInputSchema.parse,
    )
    // the loader leaves the hash out, so read it here
    const withHash = await this.userModel.findById(user._id).select('password')
    if (!withHash) {
      throw apiError('UNAUTHENTICATED', 'Session expired, please log in again')
    }
    // check if current password matches
    const isMatch = await bcrypt.compare(currentPassword, withHash.password)
    if (!isMatch) {
      throw apiError(
        'INVALID_CREDENTIALS',
        'Invalid credential: please check your password again',
      )
    }
    const hashedNewPw = await this.hashPassword(newPassword)
    const updatedUser = await this.userModel.findByIdAndUpdate(
      user._id,
      { password: hashedNewPw },
      { new: true, returnDocument: 'after' },
    )
    if (!updatedUser) {
      throw apiError('INTERNAL', 'Something went wrong, please try again.')
    }
    return null
  }
  public updateUsername = async (
    e: H3Event<EventHandlerRequest>,
  ): Promise<UserModel> => {
    const user = await getCurrentUser(e)
    const { username } = await readValidatedBody(
      e,
      newUsernameInputSchema.parse,
    )
    // already this name: nothing to change (and not a conflict with yourself)
    if (username === user.name) return user
    await this.checkUniqueUsername(username)
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        user._id,
        { name: username },
        { new: true, returnDocument: 'after' },
      )
      .select('-password')
    if (!updatedUser) {
      throw apiError('INTERNAL', 'Something went wrong, please try again.')
    }
    return updatedUser
  }
  public setAdmin = async (
    e: H3Event<EventHandlerRequest>,
  ): Promise<UserModel> => {
    const user = await getCurrentUser(e)
    const { phrase } = await readValidatedBody(e, setAdminInputSchema.parse)
    if (phrase !== this.config.adminSecretPhrase) {
      throw apiError('FORBIDDEN', 'Access denied.')
    }
    const existingAdmins = await this.userModel
      .find({ role: 'ADMIN' })
      .select('-password')
    if (existingAdmins.length > 0) {
      throw apiError('FORBIDDEN', 'Access denied: admin already exists.')
    }
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        user._id,
        { role: 'ADMIN' },
        { new: true, returnDocument: 'after' },
      )
      .select('-password')
    if (!updatedUser) {
      throw apiError('INTERNAL', 'Something went wrong, please try again.')
    }
    return updatedUser
  }
  public getUserList = async (
    e: H3Event<EventHandlerRequest>,
  ): Promise<UserModel[]> => {
    const currentUser = await getCurrentUser(e)
    if (currentUser.role !== 'ADMIN') {
      throw apiError(
        'FORBIDDEN',
        'Access denied: only admin has access to user info.',
      )
    }
    return await this.userModel
      .find({ role: { $ne: 'ADMIN' } })
      .select('-password')
  }
  public setUserRole = async (
    e: H3Event<EventHandlerRequest>,
  ): Promise<UserModel> => {
    const userId = parseObjectId(getRouterParam(e, 'id'))
    const user = await getCurrentUser(e)
    if (user.role !== 'ADMIN') {
      throw apiError(
        'FORBIDDEN',
        'Access denied: only admin has access to user info.',
      )
    }
    const { role } = await readValidatedBody(e, setUserRoleInputSchema.parse)
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { role, updatedAt: new Date() },
        { new: true, returnDocument: 'after' },
      )
      .select('-password')
    if (!updatedUser) {
      throw apiError('NOT_FOUND', 'User not found')
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
      throw apiError(
        'CONFLICT',
        `Username '${username}' is already in use, please use a different one.`,
      )
    }
  }
}
