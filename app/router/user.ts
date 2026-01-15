import { authorized } from "../middlewares/auth";

export const getCurrentUser = authorized
  .route({
    path: "/user/current",
    method: "GET",
    summary: "Get current authenticated user",
  })
  .handler(async ({ context }) => {
    return context.user;
  });
