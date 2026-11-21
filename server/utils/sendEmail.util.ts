import { useRuntimeConfig } from '#imports'
import nodemailer from 'nodemailer'
import { apiError } from './apiError.util'

export const sendEmail = async (
  email: string,
  subject: string,
  text: string,
) => {
  const config = useRuntimeConfig()
  try {
    const transporter = nodemailer.createTransport({
      host: config.mailerHost,
      port: Number(config.mailerPort),
      secure: Boolean(config.mailerSecure),
      auth: {
        user: config.mailerEmailAddress,
        pass: config.mailerAppPassword,
      },
    })
    await transporter.sendMail({
      from: config.mailerEmailAddress,
      to: email,
      subject,
      text,
    })
  } catch (err) {
    console.error(err)
    throw apiError('UPSTREAM_FAILED', 'Failed to send email, please try again')
  }
}
