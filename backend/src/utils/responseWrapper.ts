import { Response } from "express";
import { ApiResponse } from "./ApiResponse.js";

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
) => {
  const responseBody: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(responseBody);
};

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  errorCode: string,
  details?: any,
) => {
  const responseBody: ApiResponse = {
    success: false,
    message,
    error: {
      code: errorCode,
      details,
    },
  };
  return res.status(statusCode).json(responseBody);
};
