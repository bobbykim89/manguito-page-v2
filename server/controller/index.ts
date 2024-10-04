import { Comment, Post, User } from '@/server/models'

import { AuthController } from './auth/auth.controller'
import { CommentController } from './comment/comment.controller'
import { PostController } from './post/post.controller'
import { TokenController } from './token/token.controller'
import { UserController } from './user/user.controller'

export const authController = new AuthController(User)
export const commentController = new CommentController(Comment)
export const postController = new PostController(Post)
export const userController = new UserController(User)
export const tokenController = new TokenController()
