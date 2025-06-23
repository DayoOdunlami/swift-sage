import { TodoistApi } from "@doist/todoist-api-typescript";

const api = new TodoistApi(process.env.TODOIST_API_KEY!);
const isDev = process.env.NODE_ENV === 'development';

export async function createTask(
  content: string,
  options?: {
    dueString?: string;
    labels?: string[];
  }
) {
  if (isDev) console.log('🔧 Tool called: createTask', { content, options });
  
  try {
    const task = await api.addTask({
      content,
      dueString: options?.dueString,
      labels: options?.labels,
    });
    if (isDev) console.log('✅ Task created:', task.id);
    return JSON.stringify(task);
  } catch (error) {
    if (isDev) console.log('❌ Task creation failed:', error);
    return "Error creating task. Please check the server logs.";
  }
}

export async function listTasks(filter?: string) {
  if (isDev) console.log('🔧 Tool called: listTasks', { filter });
  
  try {
    const tasks = await api.getTasks({ filter });
    if (isDev) console.log('✅ Tasks retrieved:', tasks.length);
    return JSON.stringify(tasks);
  } catch (error) {
    if (isDev) console.log('❌ Task listing failed:', error);
    return "Error listing tasks. Please check the server logs.";
  }
}

export const tools = [
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
];