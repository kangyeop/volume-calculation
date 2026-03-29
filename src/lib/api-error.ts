import { NextResponse } from 'next/server';

export function handleApiError(error: unknown, context: string) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[API] ${context}:`, message);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  return NextResponse.json({ error: message }, { status: 500 });
}
