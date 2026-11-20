import { useRuntimeConfig } from '#imports'
import { createError } from 'h3'
import nodemailer from 'nodemailer'

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
  } catch {
    throw createError({
      status: 500,
      message: 'Internal Server Error',
      statusMessage: 'Failed to send email, please try again',
    })
  }
}
