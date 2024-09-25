import { type CommentModel, type UserModel, User } from '@/server/models'
import type { EventHandlerRequest, H3Event } from 'h3'
import {
  createError,
  getResponseStatus,
  getResponseStatusText,
  getRouterParam,
  readValidatedBody,
  setResponseStatus,
} from 'h3'
import { Model } from 'mongoose'
import { UserController } from '../user/user.controller'
import { commentInputSchema } from './dto'

export class CommentController<T extends CommentModel> {
  private commentModel: Model<T>
  private userController: UserController<UserModel>

  constructor(commentModel: Model<T>) {
    this.commentModel = commentModel
    this.userController = new UserController(User)
  }
  public getAllComment = async (): Promise<T[]> => {
    const comments = await this.commentModel.find({}).populate([
      { path: 'author', select: 'id name' },
      { path: 'post', select: 'id date updatedAt' },
    ])
    if (!comments) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'Comments not found',
      })
    }
    return comments
  }
  public getCommentsByPostId = async (
    e: H3Event<EventHandlerRequest>
  ): Promise<T[]> => {
    const postId = getRouterParam(e, 'id')
    const comments = await this.commentModel.find({ post: postId }).populate([
      { path: 'author', select: 'id name' },
      { path: 'post', select: 'id date updatedAt' },
    ])
    if (!comments) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'Comments not found',
      })
    }
    return comments
  }
  public createNewComment = async (
    e: H3Event<EventHandlerRequest>
  ): Promise<T> => {
    const postId = getRouterParam(e, 'id')
    const user = await this.userController.getCurrentUserData(e.context)
    const { text } = await readValidatedBody(e, commentInputSchema.parse)
    const newComment = new this.commentModel({
      text,
      author: user.id,
      post: postId,
    })
    const comment = await newComment.save()
    if (!comment) {
      throw createError({
        status: 520,
        message: 'Unknown',
        statusMessage: 'Something went wrong, please try again.',
      })
    }
    return await comment.populate([
      { path: 'author', select: 'id name' },
      { path: 'post', select: 'id date updatedAt' },
    ])
  }
  public deleteCommentById = async (e: H3Event<EventHandlerRequest>) => {
    const commentId = getRouterParam(e, 'id')
    const user = await this.userController.getCurrentUserData(e.context)
    const comment = await this.commentModel.findById(commentId)
    if (!comment) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'Not found: comment not found',
      })
    }
    if (
      comment.author.toString() !== user.id &&
      user.role !== 'ADMIN' &&
      user.role !== 'MANAGER'
    ) {
      throw createError({
        status: 401,
        message: 'Unauthorized',
        statusMessage:
          'Unauthorized: current user is not authorized for this action.',
      })
    }
    await this.commentModel.findByIdAndDelete(commentId)
    setResponseStatus(e, 200, 'Successfuly deleted the comment.')
    const status = getResponseStatus(e)
    const statusText = getResponseStatusText(e)
    return {
      status,
      text: statusText,
    }
  }
}
