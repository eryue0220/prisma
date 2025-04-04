import { foreignKeyForProvider, idForProvider } from '../../_utils/idForProvider'
import testMatrix from '../_matrix'

export default testMatrix.setupSchema(({ provider }) => {
  return /* Prisma */ `
      generator client {
        provider = "prisma-client-js"
        previewFeatures = ["strictUndefinedChecks"]
      }

      datasource db {
        provider = "${provider}"
        url      = env("DATABASE_URI_${provider}")
      }

      model User {
        id ${idForProvider(provider)}
        email String
        posts Post[]
      }

      model Post {
        id ${idForProvider(provider)}
        text String
        authorId ${foreignKeyForProvider(provider)}
        author User @relation(fields: [authorId], references: [id])
      }
      `
})
