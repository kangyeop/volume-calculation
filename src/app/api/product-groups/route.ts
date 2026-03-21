import { NextRequest, NextResponse } from 'next/server';
import * as productGroupsService from '@/lib/services/product-groups';

export async function GET() {
  try {
    const result = await productGroupsService.findAll();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch product groups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await productGroupsService.create(body.name);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product group' }, { status: 500 });
  }
}
