export interface MongoUrlConfig {
  /** Full connection string; when set, it wins (tests set NUXT_MONGO_URI). */
  mongoUri?: string
  workBranch?: string
  mongoId?: string
  mongoPw?: string
  mongoClusterName?: string
  mongoUrl?: string
  mongoDBName?: string
}

/** The MongoDB connection string for the current environment. */
export const resolveMongoUrl = (config: MongoUrlConfig): string => {
  if (config.mongoUri) return config.mongoUri
  return config.workBranch === 'LOCAL'
    ? `mongodb://${config.mongoId}:${config.mongoPw}@localhost:8080`
    : `mongodb+srv://${config.mongoId}:${config.mongoPw}@${config.mongoClusterName}.${config.mongoUrl}.mongodb.net/${config.mongoDBName}?retryWrites=true&w=majority`
}
