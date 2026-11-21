import { userController } from '../../../controller'

export default defineApiRoute({
  middleware: [checkAuth],
  handler: userController.getUserList,
})
