import { NextResponse } from 'next/server';

const AI_FUNCTIONS = [
    {
      name: 'process_voice_command',
      status: 'implemented' as const,
      description: 'Handles voice input, transcription, and initial AI processing.',
      category: 'voice' as const,
    },
    {
      name: 'text_to_speech',
      status: 'implemented' as const,
      description: 'Converts text responses into audible speech.',
      category: 'voice' as const,
    },
    {
      name: 'create_task',
      status: 'planned' as const,
      description: 'Create a new task in Todoist.',
      category: 'todoist' as const,
    },
    {
      name: 'complete_task_by_name',
      status: 'planned' as const,
      description: 'Mark a task as complete by its name.',
      category: 'todoist' as const,
    },
    {
      name: 'find_tasks',
      status: 'planned' as const,
      description: 'Search for tasks by keyword, filter, or date.',
      category: 'todoist' as const,
    },
];

export async function GET() {
  return NextResponse.json(AI_FUNCTIONS);
} 