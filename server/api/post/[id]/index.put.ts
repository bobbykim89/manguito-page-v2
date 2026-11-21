import { postController } from '../../../controller'

export default defineApiRoute({
  middleware: [checkAuth],
  handler: postController.updatePost,
})
