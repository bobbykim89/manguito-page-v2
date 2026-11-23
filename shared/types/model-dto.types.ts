import { CommentModel, PostModel, UserModel } from '../models'

type WithParsedId<T> = Omit<T, '_id'> & { _id: string }

export type UserType = WithParsedId<
  Omit<UserModel, 'password' | 'tokenVersion'>
>

/** A populated author: populate selects only these. */
export type AuthorType = Pick<UserType, '_id' | 'name'>

export interface PostType extends WithParsedId<Omit<PostModel, 'author'>> {
  author: AuthorType
}
export interface CommentType extends WithParsedId<
  Omit<CommentModel, 'author' | 'post'>
> {
  author: AuthorType
  /** null when the post was deleted before comments were removed with it */
  post: Pick<PostType, '_id' | 'date' | 'updatedAt'> | null
}

/** GET /api/post/:id: a post and its neighbours (newest first, wrapping). */
export interface PostWithNeighbours {
  post: PostType
  prevId: string
  nextId: string
}

/** GET /api/post: one page of the list, newest first. */
export interface PostPage {
  posts: PostType[]
  /** pass back as `cursor` for the next page; null on the last page */
  nextCursor: string | null
}
