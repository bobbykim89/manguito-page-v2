import { commentInputSchema } from '#shared/dto/comment'
import { type CommentModel, Comment } from '#shared/models'
import type { EventHandlerRequest, H3Event } from 'h3'
import { getRouterParam, readValidatedBody } from 'h3'
import { Model } from 'mongoose'
import { apiError, parseObjectId } from '../../utils'
import { UserController } from '../user/user.controller'

const COMMENT_FIELDS = [
  { path: 'author', select: 'id name' },
  { path: 'post', select: 'id date updatedAt' },
]

export class CommentController {
  private commentModel: Model<CommentModel>
  private userController: UserController

  constructor() {
    this.commentModel = Comment
    this.userController = new UserController()
  }
  public getAllComment = async (): Promise<CommentModel[]> => {
    return await this.commentModel.find({}).populate(COMMENT_FIELDS)
  }
  public getCommentsByPostId = async (
    e: H3Event<EventHandlerRequest>,
  ): Promise<CommentModel[]> => {
    const postId = parseObjectId(getRouterParam(e, 'id'))
    return await this.commentModel
      .find({ post: postId })
      .populate(COMMENT_FIELDS)
  }
  public createNewComment = async (
    e: H3Event<EventHandlerRequest>,
  ): Promise<CommentModel> => {
    const postId = parseObjectId(getRouterParam(e, 'id'))
    const user = await this.userController.getCurrentUserData(e.context)
    const { text } = await readValidatedBody(e, commentInputSchema.parse)
    const comment = await new this.commentModel({
      text,
      author: user._id,
      post: postId,
    }).save()
    return await comment.populate(COMMENT_FIELDS)
  }
  public deleteCommentById = async (e: H3Event<EventHandlerRequest>) => {
    const commentId = parseObjectId(getRouterParam(e, 'id'))
    const user = await this.userController.getCurrentUserData(e.context)
    const comment = await this.commentModel.findById(commentId)
    if (!comment) {
      throw apiError('NOT_FOUND', 'Comment not found')
    }
    if (
      !comment.author?.equals(user._id) &&
      user.role !== 'ADMIN' &&
      user.role !== 'MANAGER'
    ) {
      throw apiError(
        'FORBIDDEN',
        'Access denied: you are not allowed to delete this comment.',
      )
    }
    await this.commentModel.findByIdAndDelete(commentId)
    return { id: comment.id as string }
  }
}
