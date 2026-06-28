import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Membership from "../models/Membership.js";
import { sendError } from "../utils/responseWrapper.js";

// Extend the global Express Request interface using declaration merging
declare global {
  namespace Express {
    interface Request {
      user?: User;
      membership?: Membership;
    }
  }
}

interface JWTPayload {
  userId: number;
}

/**
 * Middleware to authenticate requests using JWT tokens
 */
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(
      res,
      401,
      "Access Denied. No token provided.",
      "UNAUTHORIZED_ACCESS",
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as JWTPayload;

    if (!decoded.userId) {
      return sendError(
        res,
        401,
        "Access Denied. Invalid token structure.",
        "INVALID_TOKEN",
      );
    }

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return sendError(
        res,
        401,
        "Access Denied. User does not exist.",
        "USER_NOT_FOUND",
      );
    }

    if (user.status === "suspended") {
      return sendError(
        res,
        403,
        "Access Denied. Your account has been suspended.",
        "ACCOUNT_SUSPENDED",
      );
    }

    req.user = user;
    next();
  } catch (error: any) {
    return sendError(
      res,
      401,
      "Access Denied. Invalid or expired token.",
      "INVALID_TOKEN",
      error.message,
    );
  }
};

/**
 * Curried role gate to enforce RBAC constraints
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Authenticate JWT must run before requireRole, so req.user must be populated
    if (!req.user) {
      return sendError(
        res,
        401,
        "Access Denied. User authentication required.",
        "UNAUTHENTICATED",
      );
    }

    // societyId can be passed via route params, headers, query string, or body
    const societyIdStr =
      req.headers["x-society-id"] ||
      req.params.societyId ||
      req.params.id ||
      req.query.societyId ||
      req.body.societyId;

    if (!societyIdStr) {
      return sendError(
        res,
        400,
        "Society ID is required for authorization.",
        "MISSING_SOCIETY_ID",
      );
    }

    const societyId = Number(societyIdStr);
    if (isNaN(societyId)) {
      return sendError(
        res,
        400,
        "Invalid Society ID parameter.",
        "INVALID_SOCIETY_ID",
      );
    }

    try {
      const membership = await Membership.findOne({
        where: {
          userId: req.user.id,
          societyId,
          status: "active",
        },
      });

      if (!membership) {
        return sendError(
          res,
          403,
          "Access Denied. You are not an active member of this society.",
          "UNAUTHORIZED_ACCESS",
        );
      }

      if (!allowedRoles.includes(membership.role)) {
        return sendError(
          res,
          403,
          "Access Denied. You do not have the required role privileges.",
          "UNAUTHORIZED_ACCESS",
        );
      }

      req.membership = membership;
      next();
    } catch (error: any) {
      return sendError(
        res,
        500,
        "Authorization check failed.",
        "AUTH_GATE_ERROR",
        error.message,
      );
    }
  };
};
