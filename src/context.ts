import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config();

export function createContext({ req }: any) {
  const { authorization } = req.headers;

  if (authorization) {
    const token = authorization.replace("Bearer ", "");
    const decoded: any = jwt.verify(token, String(process.env.APP_SECRET));

    if (decoded.userId) {
      return { userId: decoded.userId, permissions: decoded.permissions };
    }
  }

  return null;
}
