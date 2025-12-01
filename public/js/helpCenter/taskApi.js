export async function joinTask(taskId, note) {
  try {
    const response = await fetch(`/api/tasks/single/${encodeURIComponent(taskId)}/join`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ note: note || "" }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized: Please log in");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "Failed to join task");
      }
      if (response.status === 404) {
        throw new Error("Task not found");
      }
      throw new Error(`Failed to join task: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error joining task:", error);
    throw error;
  }
}


export async function quitTask(taskId) {
  try {
    const response = await fetch(`/api/tasks/single/${encodeURIComponent(taskId)}/quit`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized: Please log in");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "Failed to quit task");
      }
      if (response.status === 404) {
        throw new Error("Task not found");
      }
      throw new Error(`Failed to quit task: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error quitting task:", error);
    throw error;
  }
}

export async function uploadTaskLog(taskId, logText) {
  try {
    const response = await fetch(`/api/tasks/single/${encodeURIComponent(taskId)}/logs`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        summary: logText.trim(),
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Unauthorized: Please log in");
      }
      if (response.status === 400) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload task log");
      }
      if (response.status === 403) {
        const error = await response.json();
        throw new Error(error.message || "Only participants can add task logs");
      }
      if (response.status === 404) {
        throw new Error("Task not found");
      }
      throw new Error(`Failed to upload task log: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading task log:", error);
    throw error;
  }
}


export async function fetchTask(taskId) {
  try {
    const response = await fetch(`/api/tasks/single/${encodeURIComponent(taskId)}`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch task: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching task:", error);
    throw error;
  }
}

