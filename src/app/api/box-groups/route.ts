import { NextRequest, NextResponse } from 'next/server';
import * as boxGroupsService from '@/lib/services/box-groups';

export async function GET() {
  try {
    const result = await boxGroupsService.findAll();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch box groups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await boxGroupsService.create(body.name);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create box group' }, { status: 500 });
  }
}
