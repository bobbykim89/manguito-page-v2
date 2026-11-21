import { commentController } from '../../../controller'

export default defineApiRoute({
  middleware: [checkAuth],
  handler: commentController.createNewComment,
})
