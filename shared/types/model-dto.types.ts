import { CommentModel, PostModel, UserModel } from '../models'

type WithParsedId<T> = Omit<T, '_id'> & { _id: string }

export type UserType = WithParsedId<
  Omit<UserModel, 'password' | 'tokenVersion'>
>

export interface PostType extends WithParsedId<Omit<PostModel, 'author'>> {
  author: UserType
}
export interface CommentType extends WithParsedId<
  Omit<CommentModel, 'author' | 'post'>
> {
  author: UserType
  post: PostType
}
