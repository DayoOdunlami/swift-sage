// This file is now dependency-free and uses direct fetch calls.

const TODOIST_API_BASE = 'https://api.todoist.com/rest/v2';
const isDev = process.env.NODE_ENV === 'development';

export async function createTask(args: any) {
  console.log('createTask called with:', args);
  if (isDev) console.log('🔧 Tool called: createTask', args);
  
  try {
    // Get all projects to match against
    const projects = await getProjects();
    let projectId = null;
    let taskContent = args.content;
    // Simple project detection - look for project names in content
    const projectKeywords = ['matrix mechanics', 'Matrix mechanics', 'home', 'work', 'education'];
    for (const project of projects) {
      for (const keyword of projectKeywords) {
        if (taskContent.toLowerCase().includes(keyword.toLowerCase())) {
          if (project.name.toLowerCase().includes(keyword.toLowerCase())) {
            projectId = project.id;
            console.log(`Matched project: ${project.name} (ID: ${projectId})`);
            break;
          }
        }
      }
      if (projectId) break;
    }
    // Build request body
    const requestBody: any = {
      content: taskContent
    };
    // Add project if found
    if (projectId) {
      requestBody.project_id = projectId;
    }
    const response = await fetch(`${TODOIST_API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TODOIST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    console.log('Todoist API response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Todoist API error:', response.status, errorText);
      return `Failed to create task: ${response.status} - ${errorText}`;
    }
    const task = await response.json();
    if (isDev) console.log('✅ Task created:', task.id);
    const projectName = projectId ? 
      ` in project "${projects.find((p: any) => p.id === projectId)?.name}"` : 
      ' in Inbox';
    return `Task created: "${task.content}"${projectName}`;
  } catch (error: any) {
    console.error('createTask error:', error);
    return `Error creating task: ${error.message}`;
  }
}

export async function listTasks(args: any) {
  console.log('listTasks called with:', args);
  try {
    // Build query parameters for filtering
    let url = `${TODOIST_API_BASE}/tasks`;
    const params = new URLSearchParams();
    
    // Add filter if provided (for searching task content)
    if (args.filter) {
      params.append('filter', args.filter);
    }
    
    // Add the query parameters to URL if any exist
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.TODOIST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Todoist API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Todoist API error:', response.status, errorText);
      return `Failed to fetch tasks: ${response.status} - ${errorText}`;
    }
    
    const tasks = await response.json();
    console.log('Tasks retrieved:', tasks.length);
    
    // If no tasks found
    if (tasks.length === 0) {
      return args.filter ? 
        `No tasks found matching "${args.filter}".` : 
        `You have no tasks in your Todoist.`;
    }
    
    // Format detailed response
    let response_text = `Found ${tasks.length} task${tasks.length > 1 ? 's' : ''}`;
    if (args.filter) {
      response_text += ` matching "${args.filter}"`;
    }
    response_text += ':\n\n';
    
    // Add first 5 tasks with details
    const tasksToShow = tasks.slice(0, 5);
    tasksToShow.forEach((task: any, index: number) => {
      response_text += `${index + 1}. ${task.content}`;
      if (task.due && task.due.string) {
        response_text += ` (Due: ${task.due.string})`;
      }
      response_text += '\n';
    });
    
    // Add more indicator if there are additional tasks
    if (tasks.length > 5) {
      response_text += `\n... and ${tasks.length - 5} more tasks.`;
    }
    
    return response_text;
    
  } catch (error: any) {
    console.error('listTasks error:', error);
    return `Error listing tasks: ${error.message}`;
  }
}

export async function getProjects() {
  try {
    const response = await fetch(`${TODOIST_API_BASE}/projects`, {
      headers: {
        'Authorization': `Bearer ${process.env.TODOIST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      console.error('Failed to fetch projects:', response.status);
      return [];
    }
    const projects = await response.json();
    return projects;
  } catch (error) {
    console.error('getProjects error:', error);
    return [];
  }
}

// Complete/close a task
export async function completeTask(args: any) {
  console.log('completeTask called with:', args);
  try {
    // First, find the task by searching content
    const allTasks = await fetch(`${TODOIST_API_BASE}/tasks`, {
      headers: {
        'Authorization': `Bearer ${process.env.TODOIST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!allTasks.ok) {
      return `Failed to fetch tasks for completion`;
    }
    const tasks = await allTasks.json();
    // Find task by partial content match
    const searchTerm = args.taskIdentifier || args.content || args.task;
    const matchingTask = tasks.find((task: any) => 
      task.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (!matchingTask) {
      return `No task found matching "${searchTerm}". Please be more specific.`;
    }
    // Complete the task
    const response = await fetch(`${TODOIST_API_BASE}/tasks/${matchingTask.id}/close`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TODOIST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      return `Failed to complete task: ${response.status} - ${errorText}`;
    }
    return `Task completed: "${matchingTask.content}"`;
  } catch (error) {
    console.error('completeTask error:', error);
    return `Error completing task: ${error.message}`;
  }
}

// Update/edit a task
export async function updateTask(args: any) {
  console.log('updateTask called with:', args);
  try {
    // Get all tasks to find the one to update
    const allTasks = await fetch(`${TODOIST_API_BASE}/tasks`, {
      headers: {
        'Authorization': `Bearer ${process.env.TODOIST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!allTasks.ok) {
      return `Failed to fetch tasks for updating`;
    }
    const tasks = await allTasks.json();
    // Find task by partial content match
    const searchTerm = args.taskIdentifier || args.oldContent || args.task;
    const matchingTask = tasks.find((task: any) => 
      task.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (!matchingTask) {
      return `No task found matching "${searchTerm}". Please be more specific.`;
    }
    // Build update payload
    const updatePayload: any = {};
    if (args.newContent || args.content) {
      updatePayload.content = args.newContent || args.content;
    }
    if (args.dueString) {
      updatePayload.due_string = args.dueString;
    }
    const response = await fetch(`${TODOIST_API_BASE}/tasks/${matchingTask.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TODOIST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });
    if (!response.ok) {
      const errorText = await response.text();
      return `Failed to update task: ${response.status} - ${errorText}`;
    }
    const updatedTask = await response.json();
    return `Task updated: "${updatedTask.content}"`;
  } catch (error) {
    console.error('updateTask error:', error);
    return `Error updating task: ${error.message}`;
  }
}

// Delete a task
export async function deleteTask(args: any) {
  console.log('deleteTask called with:', args);
  try {
    // Get all tasks to find the one to delete
    const allTasks = await fetch(`${TODOIST_API_BASE}/tasks`, {
      headers: {
        'Authorization': `Bearer ${process.env.TODOIST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!allTasks.ok) {
      return `Failed to fetch tasks for deletion`;
    }
    const tasks = await allTasks.json();
    // Find task by partial content match
    const searchTerm = args.taskIdentifier || args.content || args.task;
    const matchingTask = tasks.find((task: any) => 
      task.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (!matchingTask) {
      return `No task found matching "${searchTerm}". Please be more specific.`;
    }
    const response = await fetch(`${TODOIST_API_BASE}/tasks/${matchingTask.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.TODOIST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      return `Failed to delete task: ${response.status} - ${errorText}`;
    }
    return `Task deleted: "${matchingTask.content}"`;
  } catch (error) {
    console.error('deleteTask error:', error);
    return `Error deleting task: ${error.message}`;
  }
}

export const tools: any[] = [
  {
    type: "function",
    function: {
      name: "createTask",
      description: "Creates a new task in Todoist. If a project name is mentioned in the content, the task will be placed in that project.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content of the task (e.g., 'Buy milk')",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listTasks",
      description: "List tasks from Todoist. Optionally filter by content.",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            description: "Optional filter (e.g., 'today', 'p1', or search text)",
          },
        },
      },
    },
  },
  // Add CRUD tools
  {
    type: "function",
    function: {
      name: "completeTask",
      description: "Mark a task as completed in Todoist",
      parameters: {
        type: "object",
        properties: {
          taskIdentifier: {
            type: "string",
            description: "Part of the task content to identify which task to complete"
          }
        },
        required: ["taskIdentifier"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateTask",
      description: "Edit or update a task in Todoist",
      parameters: {
        type: "object",
        properties: {
          taskIdentifier: {
            type: "string",
            description: "Part of the task content to identify which task to update"
          },
          newContent: {
            type: "string",
            description: "New content/text for the task"
          },
          dueString: {
            type: "string",
            description: "New due date in natural language (e.g., 'tomorrow', 'next week')"
          }
        },
        required: ["taskIdentifier"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "deleteTask",
      description: "Delete a task from Todoist permanently",
      parameters: {
        type: "object",
        properties: {
          taskIdentifier: {
            type: "string",
            description: "Part of the task content to identify which task to delete"
          }
        },
        required: ["taskIdentifier"]
      }
    }
  }
] as const;