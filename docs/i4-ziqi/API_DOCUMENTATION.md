# Task Management API Documentation

**Version:** 1.0.0  
**Base URL:** `/api/tasks`  
**Authentication:** Cookie-based JWT (`jwt_token`)

## Table of Contents

1. [Overview](#overview)
2. [Task Endpoints](#task-endpoints)
3. [RESTful Compliance Notes](#restful-compliance-notes)
4. [Error Responses](#error-responses)

---

## Overview

This API provides endpoints for managing tasks in the ESN (Emergency Support Network) Task Center. Tasks can be created, viewed, updated, and deleted by authenticated users. Users can also join tasks as participants, quit tasks, and add log entries to tasks they're participating in.

**Authentication:** All endpoints require authentication via an HTTP-only cookie named `jwt_token`. This cookie is set automatically upon successful login or registration.

---

## Task Endpoints

### Create a New Task

**Endpoint:** `POST /api/tasks`

**Description:** Creates a new task in the ESN Task Center. The task will be visible to all citizens and default to OPEN status.

**Authentication:** Required

**Request Body:**
```json
{
  "title": "Help clear debris from Main Street",
  "description": "Need help clearing fallen branches and debris from Main Street after the storm",
  "category": "debris_removal_and_cleanup",
  "helpers": 3,
  "emergencyLevel": "urgent",
  "taskType": "normal",
  "dueDate": "2024-10-25T18:00:00.000Z",
  "location": "123 Main Street",
  "resourcesNeeded": {
    "shovels": 5,
    "gloves": 10
  },
  "skillsRequired": ["heavy_lifting", "first_aid"]
}
```

**Required Fields:**
- `title` (string, max 50 characters) - Task title
- `description` (string) - Brief description of task goals and constraints
- `category` (enum) - Task category: `debris_removal_and_cleanup`, `temporary_repair`, `animal_care`, `others`
- `helpers` (integer, minimum 1) - Number of helpers needed
- `emergencyLevel` (enum) - Emergency level: `critical`, `urgent`, `standard`, `scheduled`
- `taskType` (enum) - Task type: `normal`, `asap`, `schedule`

**Optional Fields:**
- `dueDate` (date-time) - Due date (required for `normal` type, optional for `asap`/`schedule`)
- `location` (string) - Location where the task will be performed
- `resourcesNeeded` (object) - Map of resource names to quantities needed
- `skillsRequired` (array of strings) - Array of required skills

**Response:**
- `201 Created`
  ```json
  {
    "status": "success",
    "message": "Task created successfully",
    "task": {
      "id": "507f1f77bcf86cd799439011",
      "title": "Help clear debris from Main Street",
      "description": "Need help clearing fallen branches...",
      "category": "debris_removal_and_cleanup",
      "helpers": 3,
      "emergencyLevel": "urgent",
      "taskType": "normal",
      "isOpen": true,
      "creator": {
        "username": "alice"
      }
    }
  }
  ```
- `400 Bad Request` - Invalid input or validation error
- `401 Unauthorized`
- `500 Server Error`

---

### Get All Tasks

**Endpoint:** `GET /api/tasks`

**Description:** Retrieves all tasks visible to all citizens. Supports filtering by emergency level, category, and status, as well as sorting and pagination.

**Authentication:** Required

**Query Parameters:**
- `emergencyLevel` (string, optional) - Filter by: `critical`, `urgent`, `standard`, `scheduled`
- `category` (string, optional) - Filter by: `debris_removal_and_cleanup`, `temporary_repair`, `animal_care`, `others`
- `isOpen` (boolean, optional) - Filter by open/closed status
- `sortBy` (string, optional, default: `createdAt`) - Sort by: `emergencyLevel`, `helpers`, `category`, `createdAt`, `updatedAt`, `isOpen`
- `sortOrder` (string, optional, default: `desc`) - Sort order: `asc`, `desc`
- `limit` (integer, optional) - Limit number of results
- `skip` (integer, optional) - Skip number of results for pagination

**Response:**
- `200 OK` - Array of tasks
  ```json
  [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "Help clear debris from Main Street",
      "description": "Need help clearing fallen branches...",
      "category": "debris_removal_and_cleanup",
      "helpers": 3,
      "emergencyLevel": "urgent",
      "taskType": "normal",
      "dueDate": "2024-10-25T18:00:00.000Z",
      "location": "123 Main Street",
      "resourcesNeeded": {},
      "skillsRequired": [],
      "isOpen": true,
      "creator": {
        "username": "alice"
      },
      "createdAt": "2024-10-24T10:30:00.000Z",
      "updatedAt": "2024-10-24T10:30:00.000Z"
    }
  ]
  ```
- `401 Unauthorized`
- `500 Server Error`

---

### Get Task by ID

**Endpoint:** `GET /api/tasks/single/{id}`

**Description:** Retrieves detailed information about a specific task, including participant information and logs if the user is authenticated.

**Authentication:** Required

**Path Parameters:**
- `id` (string, required) - Task ID

**Response:**
- `200 OK` - Task details
  ```json
  {
    "id": "507f1f77bcf86cd799439011",
    "title": "Help clear debris from Main Street",
    "description": "Need help clearing fallen branches...",
    "category": "debris_removal_and_cleanup",
    "helpers": 3,
    "emergencyLevel": "urgent",
    "taskType": "normal",
    "dueDate": "2024-10-25T18:00:00.000Z",
    "location": "123 Main Street",
    "resourcesNeeded": {},
    "skillsRequired": [],
    "isOpen": true,
    "creator": {
      "id": "user123",
      "username": "alice"
    },
    "participants": [],
    "logs": [],
    "createdAt": "2024-10-24T10:30:00.000Z",
    "updatedAt": "2024-10-24T10:30:00.000Z"
  }
  ```
- `400 Bad Request` - Missing task ID
- `401 Unauthorized`
- `404 Not Found` - Task not found
- `500 Server Error`

**Note:** This endpoint is not fully RESTful. Consider using `GET /api/tasks/{id}` instead.

---

### Update Task

**Endpoint:** `PUT /api/tasks/single/{id}`

**Description:** Updates a task. Only the task owner can update their own tasks. The updatedAt timestamp is automatically updated.

**Authentication:** Required

**Path Parameters:**
- `id` (string, required) - Task ID

**Request Body:** (All fields optional, same structure as Create Task)
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "category": "temporary_repair",
  "helpers": 5,
  "emergencyLevel": "critical",
  "taskType": "asap",
  "dueDate": "2024-10-26T18:00:00.000Z",
  "location": "456 Oak Avenue",
  "resourcesNeeded": {
    "tools": 10
  },
  "skillsRequired": ["electrical"],
  "isOpen": false
}
```

**Response:**
- `200 OK`
  ```json
  {
    "status": "success",
    "message": "Task updated successfully",
    "task": {
      "id": "507f1f77bcf86cd799439011",
      "title": "Updated task title",
      ...
    }
  }
  ```
- `400 Bad Request` - Invalid input or missing task ID
- `401 Unauthorized`
- `403 Forbidden` - Only task owner can update
- `404 Not Found` - Task not found
- `500 Server Error`

**Note:** This endpoint is not fully RESTful. Consider using `PUT /api/tasks/{id}` instead.

---

### Delete Task

**Endpoint:** `DELETE /api/tasks/single/{id}`

**Description:** Deletes a task. Only the task owner can delete their own tasks.

**Authentication:** Required

**Path Parameters:**
- `id` (string, required) - Task ID

**Response:**
- `200 OK`
  ```json
  {
    "status": "success",
    "message": "Task deleted successfully"
  }
  ```
- `400 Bad Request` - Missing task ID
- `401 Unauthorized`
- `403 Forbidden` - Only task owner can delete
- `404 Not Found` - Task not found
- `500 Server Error`

**Note:** This endpoint is not fully RESTful. Consider using `DELETE /api/tasks/{id}` instead.

---

### Get My Tasks

**Endpoint:** `GET /api/tasks/self`

**Description:** Retrieves all tasks created by or participated by the authenticated user (My Tasks page). Supports filtering, sorting, and pagination.

**Authentication:** Required

**Query Parameters:** (Same as Get All Tasks)
- `emergencyLevel` (string, optional)
- `category` (string, optional)
- `isOpen` (boolean, optional)
- `sortBy` (string, optional, default: `createdAt`)
- `sortOrder` (string, optional, default: `desc`)
- `limit` (integer, optional)
- `skip` (integer, optional)

**Response:**
- `200 OK` - Array of tasks created by or participated by the user
  ```json
  [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "Help clear debris from Main Street",
      "isOpen": true,
      "isOwner": true,
      "isParticipant": false,
      ...
    }
  ]
  ```
- `401 Unauthorized`
- `500 Server Error`

---

### Count Tasks

**Endpoint:** `GET /api/tasks/count`

**Description:** Returns the count of tasks matching the specified filters (useful for pagination).

**Authentication:** Required

**Query Parameters:**
- `emergencyLevel` (string, optional) - Filter by emergency level
- `category` (string, optional) - Filter by category
- `isOpen` (boolean, optional) - Filter by open/closed status

**Response:**
- `200 OK`
  ```json
  {
    "count": 42
  }
  ```
- `401 Unauthorized`
- `500 Server Error`

---

### Count My Tasks

**Endpoint:** `GET /api/tasks/self/count`

**Description:** Returns the count of tasks created by the authenticated user matching the specified filters.

**Authentication:** Required

**Query Parameters:** (Same as Count Tasks)
- `emergencyLevel` (string, optional)
- `category` (string, optional)
- `isOpen` (boolean, optional)

**Response:**
- `200 OK`
  ```json
  {
    "count": 5
  }
  ```
- `401 Unauthorized`
- `500 Server Error`

---

### Count Participated Tasks

**Endpoint:** `GET /api/tasks/participated/count`

**Description:** Returns the count of tasks where the authenticated user is a participant (not owner) matching the specified filters.

**Authentication:** Required

**Query Parameters:** (Same as Count Tasks)
- `emergencyLevel` (string, optional)
- `category` (string, optional)
- `isOpen` (boolean, optional)

**Response:**
- `200 OK`
  ```json
  {
    "count": 3
  }
  ```
- `401 Unauthorized`
- `500 Server Error`

---

### Join a Task

**Endpoint:** `POST /api/tasks/single/{id}/join`

**Description:** Allows a user to join a task as a participant. The user must be authenticated and the task must be open and not full.

**Authentication:** Required

**Path Parameters:**
- `id` (string, required) - Task ID

**Request Body:** (Optional)
```json
{
  "note": "I can help with chainsaw operation and have safety equipment."
}
```

**Response:**
- `200 OK`
  ```json
  {
    "status": "success",
    "message": "Task joined successfully"
  }
  ```
- `400 Bad Request` - Task closed, full, or already a participant
- `401 Unauthorized`
- `404 Not Found` - Task not found
- `500 Server Error`

**Note:** This endpoint is not fully RESTful. Consider using `POST /api/tasks/{id}/participants` instead.

---

### Quit a Task

**Endpoint:** `POST /api/tasks/single/{id}/quit`

**Description:** Allows a participant to quit a task they have joined.

**Authentication:** Required

**Path Parameters:**
- `id` (string, required) - Task ID

**Response:**
- `200 OK`
  ```json
  {
    "status": "success",
    "message": "Task quit successfully"
  }
  ```
- `400 Bad Request` - User is not a participant
- `401 Unauthorized`
- `500 Server Error`

**Note:** This endpoint is not fully RESTful. Consider using `DELETE /api/tasks/{id}/participants/{userId}` instead.

---

### Add Task Log

**Endpoint:** `POST /api/tasks/single/{id}/logs`

**Description:** Allows a participant to add a log entry to a task. Only participants can add logs.

**Authentication:** Required

**Path Parameters:**
- `id` (string, required) - Task ID

**Request Body:**
```json
{
  "summary": "Cleared northbound lane; still 2 large trunks remaining."
}
```

**Required Fields:**
- `summary` (string) - Log summary/description

**Response:**
- `201 Created`
  ```json
  {
    "status": "success",
    "message": "Task log added successfully",
    "log": {
      "id": "log123",
      "summary": "Cleared northbound lane; still 2 large trunks remaining.",
      "participant": {
        "id": "user123",
        "username": "alice"
      },
      "createdAt": "2024-10-24T10:30:00.000Z"
    }
  }
  ```
- `400 Bad Request` - Missing summary
- `401 Unauthorized`
- `403 Forbidden` - Only participants can add logs
- `404 Not Found` - Task not found
- `500 Server Error`

**Note:** This endpoint is not fully RESTful. Consider using `POST /api/tasks/{id}/logs` instead.

---

## RESTful Compliance Notes

### Current Non-RESTful Endpoints

The following endpoints do not fully adhere to RESTful principles (nouns plural, no verbs in URLs):

1. **`/api/tasks/single/{id}`** → Should be `/api/tasks/{id}`
   - GET, PUT, DELETE operations

2. **`/api/tasks/single/{id}/join`** → Should be `/api/tasks/{id}/participants` (POST)
   - Verb "join" in URL

3. **`/api/tasks/single/{id}/quit`** → Should be `/api/tasks/{id}/participants/{userId}` (DELETE)
   - Verb "quit" in URL

4. **`/api/tasks/single/{id}/logs`** → Should be `/api/tasks/{id}/logs` (POST)
   - Remove "single" from path

### Recommended RESTful Improvements

1. **Task Resource:**
   - `GET /api/tasks/{id}` - Get task by ID
   - `PUT /api/tasks/{id}` - Update task
   - `DELETE /api/tasks/{id}` - Delete task
   - `POST /api/tasks/{id}/participants` - Join task (add participant)
   - `DELETE /api/tasks/{id}/participants/{userId}` - Quit task (remove participant)
   - `POST /api/tasks/{id}/logs` - Add task log

### RESTful Principles Applied

✅ **Good Examples:**
- `GET /api/tasks` - List resources (plural noun)
- `POST /api/tasks` - Create resource
- `GET /api/tasks/self` - Filtered collection (acceptable pattern)
- `GET /api/tasks/count` - Count operation (acceptable pattern)

✅ **HTTP Verbs Used Correctly:**
- GET - Retrieve resources
- POST - Create resources
- PUT - Update resources (full replacement)
- DELETE - Remove resources

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "status": "error",
  "message": "Invalid input or validation error"
}
```

**Common error messages:**
- "Task ID is required"
- "Invalid title: must be a string with max 50 characters"
- "Task is closed"
- "Task is full"
- "User is already a participant in this task"
- "User is not a participant in this task"
- "Log summary is required"

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "status": "error",
  "message": "Unauthorized: Only the task owner can update this task"
}
```
or
```json
{
  "status": "error",
  "message": "Only participants can add task logs"
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Task not found"
}
```

### 500 Server Error
```json
{
  "status": "error",
  "message": "Server error"
}
```

---

## Data Models

### Task Object

```json
{
  "id": "string",
  "title": "string (max 50 chars)",
  "description": "string",
  "category": "debris_removal_and_cleanup | temporary_repair | animal_care | others",
  "helpers": "integer (min 1)",
  "emergencyLevel": "critical | urgent | standard | scheduled",
  "taskType": "normal | asap | schedule",
  "dueDate": "date-time (required for normal type)",
  "location": "string (optional)",
  "resourcesNeeded": "object (optional)",
  "skillsRequired": "array of strings (optional)",
  "isOpen": "boolean",
  "creator": {
    "id": "string",
    "username": "string"
  },
  "participants": [
    {
      "id": "string",
      "username": "string",
      "joinedAt": "date-time",
      "note": "string"
    }
  ],
  "logs": [
    {
      "id": "string",
      "summary": "string",
      "participant": {
        "id": "string",
        "username": "string"
      },
      "createdAt": "date-time"
    }
  ],
  "createdAt": "date-time",
  "updatedAt": "date-time"
}
```

---

## Version History

- **1.0.0** (Current) - Initial Task Management API documentation

---

## Support

For issues or questions, please refer to the Swagger documentation at `/api-docs` or contact the development team.
