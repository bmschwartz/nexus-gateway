import { ApolloError } from "apollo-server-errors"
import {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestListener,
} from "apollo-server-plugin-base"
import loglevel from "loglevel"

interface Options {
  debug?: boolean
  enforceOperationNaming?: boolean
  enforceClientNaming?: boolean
  enforceClientVersion?: boolean
  clientNameHeader?: string
  clientVersionHeader?: string
}

export default function StrictOperationsPlugin(
  options: Options = Object.create(null),
) {
  const enforceOperationNaming = options.enforceOperationNaming || true
  const enforceClientNaming = options.enforceClientNaming || true
  const enforceClientVersion = options.enforceClientVersion || true

  const clientNameHeader =
    options.clientNameHeader || "apollographql-client-name"
  const clientVersionHeader =
    options.clientVersionHeader || "apollographql-client-version"

  const logger = loglevel.getLogger(`apollo-server:strict-operations-plugin`)
  if (options.debug === true) {
    logger.enableAll()
  }

  Object.freeze(options)

  return (): ApolloServerPlugin => ({
    requestDidStart(
      requestContext: GraphQLRequestContext,
    ): GraphQLRequestListener<any> {
      const clientName = requestContext.request.http?.headers.get(
        clientNameHeader,
      )
      const clientVersion = requestContext.request.http?.headers.get(
        clientVersionHeader,
      )

      if (enforceClientNaming && !clientName) {
        logger.debug(`Operation has no identified client`)

        throw new ApolloError(
          "Execution denied: Operation has no identified client",
        )
      }

      if (enforceClientVersion && !clientVersion) {
        logger.debug(`Client version is not identified for ${clientName}`)

        throw new ApolloError(
          `Client version is not identified for ${clientName}`,
        )
      }

      return {
        parsingDidStart({ queryHash, request }) {
          if (enforceOperationNaming && !request.operationName) {
            logger.debug(`Unnamed Operation: ${queryHash}`)

            const error = new ApolloError("Execution denied: Unnamed operation")
            Object.assign(error.extensions, {
              queryHash,
              clientName,
              clientVersion,
              exception: {
                message: `All operations must be named`,
              },
            })

            throw error
          }
        },
      }
    },
  })
}
