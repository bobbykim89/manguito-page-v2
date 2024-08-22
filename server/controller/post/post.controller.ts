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
import { updatePostInputSchema } from './dto'
import { deleteCloudinaryImage } from '@/server/utils'

export class PostController {
  userModel: Model<UserModel>
  postModel: Model<PostModel>
  commentModel: Model<CommentModel>

  constructor() {
    this.userModel = User
    this.postModel = Post
    this.commentModel = Comment
  }

  public async getAllPost(): Promise<PostModel[]> {
    const allPost = await this.postModel
      .find({})
      .populate('author')
      .select('-password')
      .sort({ date: -1 })
    if (!allPost) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'Post not found',
      })
    }
    return allPost
  }
  public async getPostById(
    e: H3Event<EventHandlerRequest>
  ): Promise<PostModel> {
    const postId = getRouterParam(e, 'id')
    const post = await this.postModel
      .findById(postId)
      .populate('author')
      .select('-password')
    if (!post) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'Cannot find post with corresponding id',
      })
    }
    return post
  }
  public async createNewPost(
    e: H3Event<EventHandlerRequest>
  ): Promise<PostModel> {
    const file = e.context.file
    const content = e.context.content
    const user = await this.checkCurrentUser(e.context)

    if (!user.admin) {
      throw createError({
        status: 401,
        message: 'Access denied',
        statusMessage: 'Access denied: unauthorized user',
      })
    }
    const newPost = new this.postModel({
      imageId: file.imageId,
      content,
      author: user.id,
    })
    const savePost = await newPost.save()

    if (!savePost) {
      throw createError({
        status: 500,
        message: 'Server error',
        statusMessage: 'Unexpected error occurred, please try again.',
      })
    }

    return savePost
  }
  public async updatePost(e: H3Event<EventHandlerRequest>): Promise<PostModel> {
    const postId = getRouterParam(e, 'id')
    const user = await this.checkCurrentUser(e.context)
    // validate body
    const { content } = await readValidatedBody(e, updatePostInputSchema.parse)
    const post = await this.postModel.findById(postId)
    if (!post) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'Post not found',
      })
    }
    if (post.author.toString() !== user.id) {
      throw createError({
        status: 401,
        message: 'Access denied',
        statusMessage:
          'Access denied: Only author of the post can update the post',
      })
    }
    const updatedPost = await this.postModel
      .findByIdAndUpdate(
        postId,
        { content, updatedAt: new Date() },
        { new: true, returnDocument: 'after' }
      )
      .populate('author')
      .select('-password')

    if (!updatedPost) {
      throw createError({
        status: 500,
        message: 'Server error',
        statusMessage: 'Unexpected error occurred, please try again.',
      })
    }
    return updatedPost
  }
  public async deletePostById(e: H3Event<EventHandlerRequest>) {
    const postId = getRouterParam(e, 'id')
    const user = await this.checkCurrentUser(e.context)
    const post = await this.postModel.findById(postId)
    if (!post) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'Not found: post not found',
      })
    }
    // check if user is authorized
    if (post.author.toString() !== user.id || !user.admin) {
      throw createError({
        status: 401,
        message: 'Unauthorized',
        statusMessage:
          'Unauthorized: current user is not authorized for this action.',
      })
    }
    // delete comments belongs to this post
    const comments = await this.commentModel.find({ post: postId })
    try {
      await this.commentModel.deleteMany({ post: postId })
    } catch (err) {
      throw createError({
        status: 500,
        message: 'Internal server error',
        statusMessage:
          'Internal server error: unexpected error happened, please try again.',
      })
    }
    // delete cloudinary image
    await deleteCloudinaryImage(post.imageId)
    // delete post
    try {
      await this.postModel.findByIdAndDelete(postId)
    } catch (err) {
      throw createError({
        status: 500,
        message: 'Internal server error',
        statusMessage:
          'Internal server error: unexpected error happened, please try again.',
      })
    }
    // send message after deletion completed
    setResponseStatus(e, 200, 'Successfuly deleted the post.')
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
