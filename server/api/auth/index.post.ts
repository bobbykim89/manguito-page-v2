import { authController } from '../../controller'

export default defineApiRoute({
  handler: authController.loginUser,
})
