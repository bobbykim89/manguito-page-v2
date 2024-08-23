import { Comment, type CommentModel } from '@/server/models'
import { Model } from 'mongoose'
import type { EventHandlerRequest, H3Event } from 'h3'
import {
  createError,
  getResponseStatus,
  getResponseStatusText,
  readValidatedBody,
  setResponseStatus,
  getRouterParam,
} from 'h3'
import { UserController } from '../user/user.controller'
import { commentInputSchema } from './dto'

export class CommentController {
  private commentModel: Model<CommentModel>
  private userController: UserController

  constructor() {
    this.commentModel = Comment
    this.userController = new UserController()
  }
  public async getAllComment(): Promise<CommentModel[]> {
    const comments = await this.commentModel
      .find({})
      .populate('author')
      .populate('post')
    if (!comments) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'Comments not found',
      })
    }
    return comments
  }
  public async getCommentsByPostId(
    e: H3Event<EventHandlerRequest>
  ): Promise<CommentModel[]> {
    const postId = getRouterParam(e, 'id')
    const comments = await this.commentModel
      .find({ post: postId })
      .populate('author')
      .populate('post')
    if (!comments) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'Comments not found',
      })
    }
    return comments
  }
  public async createNewComment(e: H3Event<EventHandlerRequest>) {
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
    return comment
  }
  public async deleteCommentById(e: H3Event<EventHandlerRequest>) {
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
    if (comment.author.toString() !== user.id || !user.admin) {
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
