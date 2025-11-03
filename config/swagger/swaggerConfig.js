// config/swagger/swaggerConfig.js
import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

const ROOT = process.cwd();
const P = (...segs) => path.resolve(ROOT, ...segs).replace(/\\/g, "/");

const options = {
  definition: {
    openapi: "3.0.0",
    info: { title: "FSE-SA2 API", version: "1.0.0", description: "REST endpoints for the ESN app" },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        cookieAuth: { type: "apiKey", in: "cookie", name: "jwt_token" },
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        ServerError: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            message: { type: "string", example: "Server error" },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }],
  },
  apis: [
    P("routes/**/*.js"),
    P("controllers/**/*.js"),
    P("config/swagger/*.yaml"),
    P("config/swagger/*.yml"),
  ],
};

//console.log("[swagger] scanning:", options.apis);

const swaggerSpec = swaggerJsdoc(options);
//console.log("[swagger] paths:", swaggerSpec.paths ? Object.keys(swaggerSpec.paths).length : 0);

export default swaggerSpec;
