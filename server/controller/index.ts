import { AuthController } from './auth/auth.controller'
import { CommentController } from './comment/comment.controller'
import { PostController } from './post/post.controller'
import { UserController } from './user/user.controller'

export const authController = new AuthController()
export const commentController = new CommentController()
export const postController = new PostController()
export const userController = new UserController()
