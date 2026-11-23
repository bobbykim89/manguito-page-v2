import { updatePostInputSchema } from '#shared/dto/post'
import {
  Comment,
  type CommentModel,
  Post,
  type PostDocument,
  type PostModel,
} from '#shared/models'
import type { EventHandlerRequest, H3Event } from 'h3'
import { getQuery, getRouterParam, readValidatedBody } from 'h3'
import { Model } from 'mongoose'
import {
  apiError,
  deleteCloudinaryImage,
  getCurrentUser,
  newerThan,
  olderThan,
  parseObjectId,
} from '../../utils'

const UNEXPECTED = 'Something went wrong, please try again.'

export class PostController {
  private postModel: Model<PostModel>
  private commentModel: Model<CommentModel>

  constructor() {
    this.postModel = Post
    this.commentModel = Comment
  }

  public getAllPost = async (): Promise<PostModel[]> => {
    return await this.postModel
      .find({})
      .populate('author', 'name')
      .sort({ date: -1 })
  }
  /**
   * One post with the ids of its neighbours in the list order (newest
   * first). `prevId` is the next newer post and `nextId` the next older one;
   * both wrap around at the ends.
   */
  public getPostWithNeighbours = async (
    e: H3Event<EventHandlerRequest>,
  ): Promise<{ post: PostDocument; prevId: string; nextId: string }> => {
    const postId = parseObjectId(getRouterParam(e, 'id'))
    // hydrated: author is populated from users that may lack schema defaults
    const post = await this.postModel
      .findById(postId)
      .populate('author', 'name')
    if (!post) throw apiError('NOT_FOUND', "This post doesn't exist.")
    const newestFirst = { date: -1, _id: -1 } as const
    const oldestFirst = { date: 1, _id: 1 } as const
    const idOnly = (
      filter: object,
      sort: typeof newestFirst | typeof oldestFirst,
    ) => this.postModel.findOne(filter).sort(sort).select('_id').lean()
    const next =
      (await idOnly(olderThan(post.date, post._id), newestFirst)) ??
      (await idOnly({}, newestFirst))
    const prev =
      (await idOnly(newerThan(post.date, post._id), oldestFirst)) ??
      (await idOnly({}, oldestFirst))
    return {
      post,
      prevId: String(prev?._id ?? post._id),
      nextId: String(next?._id ?? post._id),
    }
  }
  public getAllTrimmedPost = async (
    e: H3Event<EventHandlerRequest>,
  ): Promise<PostModel[]> => {
    const query = getQuery(e)
    if (query.sort === 'asc') {
      return await this.postModel.find({}).select('id imageId').lean()
    }
    // lean is safe here: neither field has a schema default
    return await this.postModel
      .find({})
      .sort({ date: -1 })
      .select('id imageId')
      .lean()
  }
  public createNewPost = async (
    e: H3Event<EventHandlerRequest>,
  ): Promise<PostModel> => {
    const file = e.context.file
    const content = e.context.content
    const user = await getCurrentUser(e)

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw apiError('FORBIDDEN', 'Access denied: unauthorized user')
    }
    const savePost = await new this.postModel({
      imageId: file.imageId,
      content,
      author: user._id,
    }).save()
    return await savePost.populate('author', 'name')
  }
  public updatePost = async (
    e: H3Event<EventHandlerRequest>,
  ): Promise<PostModel> => {
    const postId = parseObjectId(getRouterParam(e, 'id'))
    const user = await getCurrentUser(e)
    // validate body
    const { content } = await readValidatedBody(e, updatePostInputSchema.parse)
    const post = await this.postModel.findById(postId)
    if (!post) {
      throw apiError('NOT_FOUND', 'Post not found')
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
      throw apiError('INTERNAL', UNEXPECTED)
    }
    return updatedPost
  }
  public deletePostById = async (e: H3Event<EventHandlerRequest>) => {
    const postId = parseObjectId(getRouterParam(e, 'id'))
    const user = await getCurrentUser(e)
    const post = await this.postModel.findById(postId)
    if (!post) {
      throw apiError('NOT_FOUND', 'Post not found')
    }
    if (!post.author?.equals(user._id) && user.role !== 'ADMIN') {
      throw apiError(
        'FORBIDDEN',
        'Access denied: you are not allowed to delete this post.',
      )
    }
    // the image first, so a Cloudinary failure leaves the post and its
    // comments intact; then the comments, then the post itself
    await deleteCloudinaryImage(post.imageId)
    await this.commentModel.deleteMany({ post: postId })
    await this.postModel.findByIdAndDelete(postId)
    return { id: post.id as string }
  }
}
