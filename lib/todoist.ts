const isDev = process.env.NODE_ENV === 'development';

// This needs to be the full URL of your deployment for the internal fetch to work.
const BASE_URL = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

export async function listTasks(filter?: string) {
  if (isDev) console.log('🔧 Tool called: listTasks', { filter });

  try {
    const url = new URL('/api/todoist/tasks', BASE_URL);
    if (filter) {
      url.searchParams.append('filter', filter);
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`API returned status ${response.status}`);
    
    const tasks = await response.json();
    if (isDev) console.log('✅ Tool success: listTasks', { taskCount: tasks.length });
    return tasks;

  } catch (error: any) {
    if (isDev) console.log('❌ Tool failed: listTasks', { error: error.message });
    throw error;
  }
}

interface CreateTaskArgs {
    content: string;
    due_string?: string;
}

export async function createTask(args: CreateTaskArgs) {
    if (isDev) console.log('🔧 Tool called: createTask', args);

    try {
        const response = await fetch(new URL('/api/todoist/tasks', BASE_URL), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
        });

        if (!response.ok) throw new Error(`API returned status ${response.status}`);

        const task = await response.json();
        if (isDev) console.log('✅ Tool success: createTask', { task });
        return task;

    } catch (error: any) {
        if (isDev) console.log('❌ Tool failed: createTask', { error: error.message });
        throw error;
    }
} 