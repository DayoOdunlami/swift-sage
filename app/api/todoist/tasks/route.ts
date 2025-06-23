import { NextRequest, NextResponse } from 'next/server';

const TODOIST_API_BASE = 'https://api.todoist.com/rest/v2';

async function getApiKey() {
  const apiKey = process.env.TODOIST_API_KEY;
  if (!apiKey) {
    throw new Error('TODOIST_API_KEY environment variable not set.');
  }
  return apiKey;
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = await getApiKey();
    const response = await fetch(`${TODOIST_API_BASE}/tasks`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: 'Failed to fetch tasks from Todoist', details: errorText }, { status: response.status });
    }

    const tasks = await response.json();
    return NextResponse.json(tasks);

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = await getApiKey();
    const body = await request.json();

    if (!body.content) {
      return NextResponse.json({ error: 'Task content is required' }, { status: 400 });
    }

    const response = await fetch(`${TODOIST_API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
       const errorText = await response.text();
       return NextResponse.json({ error: 'Failed to create task in Todoist', details: errorText }, { status: response.status });
    }

    const task = await response.json();
    return NextResponse.json(task);

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
} 