import { commentController } from '../../../controller'

export default defineApiRoute({
  handler: commentController.getCommentsByPostId,
})
