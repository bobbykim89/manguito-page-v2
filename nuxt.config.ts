// https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxt/image',
    '@nuxt/fonts',
    '@vite-pwa/nuxt',
  ],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: 'ManguitoPage',
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        {
          name: 'description',
          content:
            'A photo blog dedicated to Manguito, an adorable peach-faced lovebird, showcasing daily moments and charming antics.',
        },
        { property: 'og:title', content: 'Manguito Page' },
        {
          property: 'og:description',
          content:
            'A photo blog dedicated to Manguito, an adorable peach-faced lovebird, showcasing daily moments and charming antics.',
        },
        { property: 'og:type', content: 'website' },
        {
          property: 'og:image',
          content:
            'https://res.cloudinary.com/dwgni1x3t/image/upload/c_scale/f_auto/v1700694621/assets/logo192_meuats.png',
        },
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
        {
          name: 'twitter:title',
          content: 'Manguito Page',
        },
        {
          name: 'twitter:description',
          content:
            'A photo blog dedicated to Manguito, an adorable peach-faced lovebird, showcasing daily moments and charming antics.',
        },
        {
          name: 'twitter:image',
          content:
            'https://res.cloudinary.com/dwgni1x3t/image/upload/c_scale/f_auto/v1700694621/assets/logo192_meuats.png',
        },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
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
    workBranch: process.env.WORK_BRANCH,
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
    mailerEmailAddress: process.env.MAILER_EMAIL_ADDRESS,
    mailerAppPassword: process.env.MAILER_APP_PASSWORD,
    public: {
      cloudinarySourceUrl: process.env.CLOUDINARY_SOURCE_URL,
    },
  },
  css: ['~/assets/css/page_transition.scss'],
  tailwindcss: {
    configPath: 'tailwind.config.ts',
    exposeConfig: false,
    viewer: true,
  },
  image: {
    cloudinary: {
      baseURL: process.env.CLOUDINARY_SOURCE_URL,
    },
  },
  nitro: {
    experimental: {
      openAPI: true,
    },
  },
  pwa: {
    strategies: 'generateSW',
    manifest: {
      short_name: 'ManguitoPage',
      name: 'Manguito Page',
      description:
        'A photo blog dedicated to Manguito, an adorable peach-faced lovebird, showcasing daily moments and charming antics.',
      icons: [
        {
          src: 'favicon.ico',
          sizes: '48x48',
          type: 'image/x-icon',
        },
        {
          src: 'manguito_page_logo-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: 'manguito_page_logo-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: 'manguito_page_maskable_512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      display: 'standalone',
      background_color: '#fafafa',
      theme_color: '#ec489a',
      lang: 'en-US',
      start_url: '/',
      screenshots: [
        {
          src: 'screenshot_desktop_1.png',
          sizes: '1600x1000',
          type: 'image/png',
          form_factor: 'wide',
        },
        {
          src: 'screenshot_desktop_2.png',
          sizes: '1600x1000',
          type: 'image/png',
          form_factor: 'wide',
        },
        {
          src: 'screenshot_mobile_1.png',
          sizes: '425x680',
          type: 'image/png',
          form_factor: 'narrow',
        },
        {
          src: 'screenshot_mobile_2.png',
          sizes: '425x680',
          type: 'image/png',
          form_factor: 'narrow',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
    },
    registerType: 'autoUpdate',
    devOptions: {
      enabled: false,
      // suppressWarnings: true,
      // navigateFallback: '/',
      // type: 'module',
    },
  },
})
