// config/swagger/swaggerConfig.js
import swaggerJsdoc from "swagger-jsdoc";
import { fileURLToPath } from "url";
import path, { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "FSE-SA2 API",
      version: "1.0.0",
      description: "REST endpoints for the ESN app",
    },
    servers: [
      { url: process.env.SWAGGER_SERVER_URL || "http://localhost:3000" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        PublicMessage: {
          type: "object",
          properties: {
            id: { type: "integer", example: 123 },
            text: { type: "string", example: "Hello world" },
            author: { type: "string", example: "alice" },
            createdAt: { type: "string", format: "date-time" },
          },
          required: ["text", "author"],
        },
        PrivateMessage: {
          type: "object",
          properties: {
            id: { type: "integer", example: 123 },
            text: { type: "string", example: "Hello world" },
            author: { type: "string", example: "alice" },
            createdAt: { type: "string", format: "date-time" },
          },
          required: ["text", "author"],
        },
        LoginRequest: {
          type: "object",
          properties: {
            username: { type: "string" },
            password: { type: "string" },
          },
          required: ["username", "password"],
        },
        TokenResponse: {
          type: "object",
          properties: { token: { type: "string" } },
        },
      },
    },
  },

  // 👇 IMPORTANT: point to your real files
  apis: [
    path.join(__dirname, "../../routes/*.js"),
    path.join(__dirname, "../../controllers/*.js"),
    // you can also keep standalone yaml files in this folder:
    path.join(__dirname, "./*.yaml"),
  ],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
