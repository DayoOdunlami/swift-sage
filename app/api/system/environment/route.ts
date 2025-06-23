import { NextResponse } from 'next/server';

export async function GET() {
  const environmentStatus = {
    'GROQ_API_KEY': !!process.env.GROQ_API_KEY,
    'CARTESIA_API_KEY': !!process.env.CARTESIA_API_KEY,
    'TODOIST_API_KEY': !!process.env.TODOIST_API_KEY,
    'OPENAI_API_KEY': !!process.env.OPENAI_API_KEY, // Check for this as well, just in case
  };

  return NextResponse.json(environmentStatus);
} 