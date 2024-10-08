import {
  Comment,
  type CommentModel,
  Post,
  type PostModel,
} from '@/server/models'
import { deleteCloudinaryImage } from '@/server/utils'
import type { EventHandlerRequest, H3Event } from 'h3'
import {
  createError,
  getQuery,
  getResponseStatus,
  getResponseStatusText,
  getRouterParam,
  readValidatedBody,
  setResponseStatus,
} from 'h3'
import { Model } from 'mongoose'
import { UserController } from '../user/user.controller'
import { updatePostInputSchema } from './dto'

export class PostController {
  private postModel: Model<PostModel>
  private commentModel: Model<CommentModel>
  private userController: UserController

  constructor() {
    this.postModel = Post
    this.commentModel = Comment
    this.userController = new UserController()
  }

  public getAllPost = async (): Promise<PostModel[]> => {
    const allPost = await this.postModel
      .find({})
      .populate('author', '-password -admin')
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
  public getAllTrimmedPost = async (
    e: H3Event<EventHandlerRequest>
  ): Promise<PostModel[]> => {
    const query = getQuery(e)
    let allPost: PostModel[] = await this.postModel
      .find({})
      .sort({ date: -1 })
      .select('id imageId')
    if (query.sort === 'asc') {
      allPost = await this.postModel.find({}).select('id imageId')
    }
    if (!allPost) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'Post not found',
      })
    }
    return allPost
  }
  public getPostById = async (
    e: H3Event<EventHandlerRequest>
  ): Promise<PostModel> => {
    const postId = getRouterParam(e, 'id')
    const post = await this.postModel
      .findById(postId)
      .populate('author', '-password -admin')
    if (!post) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'Cannot find post with corresponding id',
      })
    }
    return post
  }
  public createNewPost = async (
    e: H3Event<EventHandlerRequest>
  ): Promise<PostModel> => {
    const file = e.context.file
    const content = e.context.content
    const user = await this.userController.getCurrentUserData(e.context)

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
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

    return await savePost.populate('author', '-password -admin')
  }
  public updatePost = async (
    e: H3Event<EventHandlerRequest>
  ): Promise<PostModel> => {
    const postId = getRouterParam(e, 'id')
    const user = await this.userController.getCurrentUserData(e.context)
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
      .populate('author', '-password -admin')

    if (!updatedPost) {
      throw createError({
        status: 500,
        message: 'Server error',
        statusMessage: 'Unexpected error occurred, please try again.',
      })
    }
    return updatedPost
  }
  public deletePostById = async (e: H3Event<EventHandlerRequest>) => {
    const postId = getRouterParam(e, 'id')
    const user = await this.userController.getCurrentUserData(e.context)
    const post = await this.postModel.findById(postId)
    if (!post) {
      throw createError({
        status: 404,
        message: 'Not found',
        statusMessage: 'Not found: post not found',
      })
    }
    // check if user is authorized
    if (post.author.toString() !== user.id && user.role !== 'ADMIN') {
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
}
