import { postController } from '../../../controller'

export default defineApiRoute({
  handler: postController.getPostWithNeighbours,
})
