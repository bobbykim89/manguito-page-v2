import { useRuntimeConfig } from '#app'
import { type RuntimeConfig } from '@nuxt/schema'

type ImageType = 'THUMB' | 'CARD' | 'POST'

export class ImageUrl {
  imageId: string
  config: RuntimeConfig
  imageType: Record<ImageType, string>
  constructor(id: string) {
    this.imageId = id
    this.config = useRuntimeConfig()
    this.imageType = {
      THUMB: '/c_scale,w_320/f_auto/v1700694621/',
      CARD: '/c_scale,w_480/f_auto/v1700694621/',
      POST: '/c_scale,w_1200/q_auto/v1700694621/',
    }
  }
  public getThumbUrl = (): string => {
    return `${this.config.public.cloudinarySourceUrl}${this.imageType.THUMB}${this.imageId}`
  }
  public getCardUrl = (): string => {
    return `${this.config.public.cloudinarySourceUrl}${this.imageType.CARD}${this.imageId}`
  }
  public getPostUrl = (): string => {
    return `${this.config.public.cloudinarySourceUrl}${this.imageType.POST}${this.imageId}`
  }
}
