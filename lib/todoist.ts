// This file is now dependency-free and uses direct fetch calls.

const TODOIST_API_BASE = 'https://api.todoist.com/rest/v2';
const isDev = process.env.NODE_ENV === 'development';

export async function createTask(args: any) {
  console.log('createTask called with:', args);
  if (isDev) console.log('🔧 Tool called: createTask', args);
  
  try {
    const response = await fetch(`${TODOIST_API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TODOIST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: args.content
      }),
    });
    console.log('Todoist API response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Todoist API error:', response.status, errorText);
      return `Failed to create task: ${response.status} - ${errorText}`;
    }
    const task = await response.json();
    if (isDev) console.log('✅ Task created:', task.id);
    return `Task created: "${task.content}"`;
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

export const tools: any[] = [
  {
    type: "function",
    function: {
      name: "createTask",
      description: "Creates a new task in Todoist",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content of the task (e.g., 'Buy milk')",
          },
          options: {
            type: "object",
            properties: {
              dueString: {
                type: "string",
                description: "Due date in natural language (e.g., 'tomorrow at 4pm')",
              },
              labels: {
                type: "array",
                items: { type: "string" },
                description: "Array of labels to add to the task",
              },
            },
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
      description: "List tasks from Todoist",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            description: "Optional filter (e.g., 'today', 'p1')",
          },
        },
      },
    },
  },
] as const;