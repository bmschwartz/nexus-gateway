import * as dotenv from "dotenv"
import jwt from "jsonwebtoken"
import {logger} from "./logger"

dotenv.config()

export function createContext({ req }: any) {
  const { authorization } = req.headers

  if (authorization) {
    const token = authorization.replace("Bearer ", "")

    try {
      const decoded: any = jwt.verify(token, String(process.env.APP_SECRET))

      if (decoded.userId && decoded.userType) {
        return { userId: decoded.userId, userType: decoded.userType }
      }
    } catch (e) {
      logger.info("Invalid authorization token")
      return null
    }
  }

  return null
}
