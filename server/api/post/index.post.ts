import type { H3Event } from 'h3'
import { postController } from '../../controller'

const uploadPostImage = async (e: H3Event) => {
  await uploadCloudinary(e)
  await readFormDataText(e)
}

export default defineApiRoute({
  middleware: [
    checkAuth,
    // before the upload, so a refused request never reaches Cloudinary
    requireRole('ADMIN', 'MANAGER'),
    uploadPostImage,
  ],
  handler: postController.createNewPost,
  status: 201,
})
