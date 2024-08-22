// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: 'ManguitoPage',
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        {
          name: 'description',
          content: 'Photo blog for Manguito, a peachfaced lovebird',
        },
      ],
      link: [],
    },
  },
  typescript: {
    typeCheck: true,
    strict: true,
    tsConfig: {
      compilerOptions: {
        moduleResolution: 'bundler',
        verbatimModuleSyntax: false,
        strict: true,
        types: ['vite/client'],
      },
    },
  },
  runtimeConfig: {
    mongoId: process.env.MONGO_ADMIN_ID,
    mongoPw: process.env.MONGO_ADMIN_PW,
    mongoClusterName: process.env.MONGO_CLUSTER_NAME,
    mongoDBName: process.env.MONGO_DB_NAME,
    mongoUrl: process.env.MONGO_URL,
    jwtSecret: process.env.JWT_SECRET,
    adminSecretPhrase: process.env.ADMIN_SECRET_PHRASE,
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
    cloudinaryFolderName: process.env.CLOUDINARY_FOLDER,
  },
  css: ['~/assets/css/page_transition.scss'],
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    configPath: 'tailwind.config.ts',
    exposeConfig: false,
    viewer: true,
  },
  nitro: {
    plugins: ['~/server/plugin/connectDb.ts'],
    experimental: {
      openAPI: true,
    },
  },
})
