import {
  User,
  type UserModel,
  Post,
  type PostModel,
  Comment,
  type CommentModel,
} from '@/server/models'
import { Model } from 'mongoose'
import type { EventHandlerRequest, H3Event, H3EventContext } from 'h3'
import {
  createError,
  getResponseStatus,
  getResponseStatusText,
  readValidatedBody,
  setResponseStatus,
  getRouterParam,
} from 'h3'
import { commentInputSchema } from './dto'

export class CommentController {
  userModel: Model<UserModel>
  postModel: Model<PostModel>
  commentModel: Model<CommentModel>

  constructor() {
    this.userModel = User
    this.postModel = Post
    this.commentModel = Comment
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
    const user = await this.checkCurrentUser(e.context)
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
    const user = await this.checkCurrentUser(e.context)
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
  private async checkCurrentUser(ctx: H3EventContext): Promise<UserModel> {
    const user = await this.userModel.findById(ctx.user.id).select('-password')
    if (!user) {
      throw createError({
        status: 403,
        message: 'Access denied',
        statusMessage: 'Access denied: user not found',
      })
    }
    return user
  }
}
