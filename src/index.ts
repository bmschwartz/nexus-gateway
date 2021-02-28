import {
  ApolloGateway,
  GatewayConfig,
  RemoteGraphQLDataSource,
} from "@apollo/gateway"
import { ApolloServer } from "apollo-server"
import * as dotenv from "dotenv"
import { createContext } from "./context"
import DepthLimitingPlugin from "./plugins/ApolloServerPluginDepthLimiting"
import {logger} from "./logger"

dotenv.config()

const isProd = process.env.NODE_ENV === "production"
const apolloKey = process.env.APOLLO_KEY
const graphVariant = process.env.APOLLO_GRAPH_VARIANT || "development"

class AuthenticatedDataSource extends RemoteGraphQLDataSource {
  willSendRequest({ request, context }) {
    request.http.headers.set("userid", context.userId)
    request.http.headers.set("permissions", context.permissions)
  }
}

let gatewayOptions: GatewayConfig = {
  debug: !isProd,
  buildService({ url }) {
    return new AuthenticatedDataSource({ url })
  },
}

if (!apolloKey) {
  console.log(
    `Head over to https://studio.apollographql.com and create an account to follow walkthrough in the Acephei README`,
  )

  gatewayOptions = {
    serviceList: [
      { name: "exchange", url: "http://localhost:4001" },
      { name: "groups", url: "http://localhost:4002/graphql" },
      { name: "users", url: "http://localhost:4003" },
    ],
    debug: isProd ? false : true,
    buildService({ url }) {
      return new AuthenticatedDataSource({ url })
    },
  }
}

const apolloOperationRegistryPlugin = apolloKey
  ? require("apollo-server-plugin-operation-registry")({
      graphVariant,
      forbidUnregisteredOperations({
        context, // Destructure the shared request `context`.
        request: {
          http: { headers }, // Destructure the `headers` class.
        },
      }) {
        // If a magic header is in place, allow any unregistered operation.
        if (headers.get("override")) {
          return false
        }
        // Enforce operation safelisting on all other users.
        return isProd
      },
    })
  : {}

const gateway = new ApolloGateway(gatewayOptions)
const server = new ApolloServer({
  gateway,
  subscriptions: false, // Must be disabled with the gateway; see above.
  engine: {
    apiKey: apolloKey, // We set the APOLLO_KEY environment variable
    graphVariant, // We set the APOLLO_GRAPH_VARIANT environment variable
    sendVariableValues: {
      all: true,
    },
    sendHeaders: {
      all: true,
    },
  },
  context: createContext,
  plugins: [
    DepthLimitingPlugin({ maxDepth: 10 }),
    // StrictOperationsPlugin(),
    // ReportForbiddenOperationsPlugin({ debug: true }),
    // apolloOperationRegistryPlugin
  ],
})

const port = process.env.PORT || 4000
server.listen({ port }).then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`)
  logger.info(`Nexus Gateway Server ready at ${url}`)
})
