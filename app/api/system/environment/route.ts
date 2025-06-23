import { NextResponse } from 'next/server';

export async function GET() {
  const environmentChecks = [
    { name: 'GROQ_API_KEY', status: !!process.env.GROQ_API_KEY },
    { name: 'CARTESIA_API_KEY', status: !!process.env.CARTESIA_API_KEY },
    { name: 'TODOIST_API_KEY', status: !!process.env.TODOIST_API_KEY },
    { name: 'OPENAI_API_KEY', status: !!process.env.OPENAI_API_KEY },
  ];

  return NextResponse.json({ environment: environmentChecks });
} 