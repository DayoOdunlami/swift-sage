import { NextResponse } from 'next/server';

// In a real-world scenario, this could be generated at build time
// by scanning the file system. For now, we'll maintain a static list.
const API_ROUTES = [
  {
    path: '/api',
    method: 'POST',
    description: 'Main AI conversation and voice processing endpoint.',
    status: 'unknown' as const,
  },
  {
    path: '/api/system/environment',
    method: 'GET',
    description: 'Checks the status of server-side environment variables.',
    status: 'unknown' as const,
  },
  {
    path: '/api/system/routes',
    method: 'GET',
    description: 'Lists all available API routes in the application.',
    status: 'unknown' as const,
  },
  {
    path: '/api/todoist/tasks',
    method: 'GET',
    description: 'List all active tasks from Todoist.',
    status: 'unknown' as const,
  },
  {
    path: '/api/todoist/tasks',
    method: 'POST',
    description: 'Create a new task in Todoist.',
    status: 'unknown' as const,
  },
];

export async function GET() {
  return NextResponse.json({ routes: API_ROUTES });
} 