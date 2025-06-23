// This file is now dependency-free and uses direct fetch calls.

const TODOIST_API_BASE = 'https://api.todoist.com/rest/v2';
const isDev = process.env.NODE_ENV === 'development';

export async function createTask(
  content: string,
  options?: {
    dueString?: string;
    labels?: string[];
  }
) {
  console.log('createTask called with:', { content, options });
  if (isDev) console.log('🔧 Tool called: createTask', { content, options });
  
  try {
    const response = await fetch(`${TODOIST_API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TODOIST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        due_string: options?.dueString,
        labels: options?.labels,
      }),
    });
    console.log('Todoist createTask API response status:', response.status);
    if (!response.ok) {
      console.error('Todoist createTask API error:', response.status, await response.text());
      return `Failed to create task: ${response.status}`;
    }
    const task = await response.json();
    if (isDev) console.log('✅ Task created:', task.id);
    return JSON.stringify(task);
  } catch (error: any) {
    console.error('createTask error:', error);
    return `Error creating task: ${error.message}`;
  }
}

export async function listTasks(filter?: string) {
  console.log('listTasks called with:', { filter });
  if (isDev) console.log('🔧 Tool called: listTasks', { filter });
  
  try {
    const url = new URL(`${TODOIST_API_BASE}/tasks`);
    if (filter) url.searchParams.append('filter', filter);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${process.env.TODOIST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('Todoist listTasks API response status:', response.status);
    if (!response.ok) {
      console.error('Todoist listTasks API error:', response.status, await response.text());
      return `Failed to fetch tasks: ${response.status}`;
    }
    
    const tasks = await response.json();
    console.log('✅ Tasks retrieved:', tasks.length);
    return JSON.stringify(tasks);
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