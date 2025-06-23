import { NextResponse } from 'next/server';

// In a real-world scenario, this could be generated at build time
// by scanning the file system. For now, we'll maintain a static list.
const API_ROUTES = [
  {
    path: '/api',
    method: 'POST',
    purpose: 'Main AI conversation and voice processing endpoint.',
    status: 'untested' as const,
  },
  {
    path: '/api/system/environment',
    method: 'GET',
    purpose: 'Checks the status of server-side environment variables.',
    status: 'untested' as const,
  },
  {
    path: '/api/system/routes',
    method: 'GET',
    purpose: 'Lists all available API routes in the application.',
    status: 'untested' as const,
  },
  {
    path: '/api/system/functions',
    method: 'GET',
    purpose: 'Lists all available AI function tools.',
    status: 'untested' as const,
  },
  {
    path: '/api/todoist/tasks',
    method: 'GET',
    purpose: 'List all active tasks from Todoist.',
    status: 'untested' as const,
  },
  {
    path: '/api/todoist/tasks',
    method: 'POST',
    purpose: 'Create a new task in Todoist.',
    status: 'untested' as const,
  },
];

export async function GET() {
  return NextResponse.json(API_ROUTES);
} 