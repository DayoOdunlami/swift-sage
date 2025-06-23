import type { ChatCompletionTool } from 'groq-sdk/resources/chat/completions';

export const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'Get a list of tasks from Todoist. Use for any request to "show", "list", "find", or "get" tasks.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            description: 'A Todoist filter query, e.g., "today", "overdue", "p1 & next 7 days".',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
        name: 'create_task',
        description: 'Create a new task in Todoist. Use for any request to "create", "add", or "make" a task.',
        parameters: {
            type: 'object',
            properties: {
                content: {
                    type: 'string',
                    description: 'The content of the task, e.g., "Buy groceries".',
                },
                due_string: {
                    type: 'string',
                    description: 'A human-readable due date, e.g., "tomorrow at 10am" or "every day".',
                },
            },
            required: ['content'],
        }
    }
  }
]; 