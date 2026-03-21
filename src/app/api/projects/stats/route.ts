import { NextResponse } from 'next/server';
import * as projectsService from '@/lib/services/projects';

export async function GET() {
  try {
    const result = await projectsService.getStats();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch project stats' }, { status: 500 });
  }
}
