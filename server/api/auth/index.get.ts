import { authController } from '../../controller'

export default defineApiRoute({
  middleware: [checkAuth],
  handler: authController.getCurrentUser,
})
