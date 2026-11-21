import { updatePostInputSchema } from '#shared/dto/post'
import {
  Comment,
  type CommentModel,
  Post,
  type PostModel,
} from '#shared/models'
import type { EventHandlerRequest, H3Event } from 'h3'
import { createError, getQuery, getRouterParam, readValidatedBody } from 'h3'
import { Model } from 'mongoose'
import { apiError, deleteCloudinaryImage } from '../../utils'
import { UserController } from '../user/user.controller'

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
      .populate('author', 'name')
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
    e: H3Event<EventHandlerRequest>,
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
    e: H3Event<EventHandlerRequest>,
  ): Promise<PostModel> => {
    const postId = getRouterParam(e, 'id')
    if (!postId) {
      throw createError({
        status: 400,
        message: 'Bad Request',
        statusMessage: 'Missing required route parameter: id',
      })
    }
    const post = await this.postModel
      .findById(postId)
      .populate('author', 'name')
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
    e: H3Event<EventHandlerRequest>,
  ): Promise<PostModel> => {
    const file = e.context.file
    const content = e.context.content
    const user = await this.userController.getCurrentUserData(e.context)

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw apiError('FORBIDDEN', 'Access denied: unauthorized user')
    }
    const newPost = new this.postModel({
      imageId: file.imageId,
      content,
      author: user._id,
    })
    const savePost = await newPost.save()

    if (!savePost) {
      throw createError({
        status: 500,
        message: 'Server error',
        statusMessage: 'Unexpected error occurred, please try again.',
      })
    }

    return await savePost.populate('author', 'name')
  }
  public updatePost = async (
    e: H3Event<EventHandlerRequest>,
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
    if (!post.author?.equals(user._id)) {
      throw apiError(
        'FORBIDDEN',
        'Access denied: only the author of the post can update it.',
      )
    }
    const updatedPost = await this.postModel
      .findByIdAndUpdate(
        postId,
        { content, updatedAt: new Date() },
        { new: true, returnDocument: 'after' },
      )
      .populate('author', 'name')

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
    if (!post.author?.equals(user._id) && user.role !== 'ADMIN') {
      throw apiError(
        'FORBIDDEN',
        'Access denied: you are not allowed to delete this post.',
      )
    }
    // delete comments belongs to this post
    try {
      await this.commentModel.deleteMany({ post: postId })
    } catch {
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
    } catch {
      throw createError({
        status: 500,
        message: 'Internal server error',
        statusMessage:
          'Internal server error: unexpected error happened, please try again.',
      })
    }
    return { id: post.id as string }
  }
}
