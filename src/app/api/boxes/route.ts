import { NextRequest, NextResponse } from 'next/server';
import * as boxesService from '@/lib/services/boxes';

export async function GET() {
  try {
    const result = await boxesService.findAll();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch boxes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await boxesService.create(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create box' }, { status: 500 });
  }
}
