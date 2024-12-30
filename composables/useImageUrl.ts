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
      THUMB: '/c_scale,w_320/',
      CARD: '/c_scale,w_480/',
      POST: '/c_scale,w_800/',
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
  public getNuxtImageCardUrl = (): string => {
    return `${this.imageType.CARD}${this.imageId}`
  }
  public getNuxtImagePostUrl = (): string => {
    return `${this.imageType.POST}${this.imageId}`
  }
}
