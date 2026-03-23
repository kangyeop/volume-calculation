import { NextResponse } from 'next/server';
import * as productsService from '@/lib/services/products';

export async function GET() {
  try {
    const products = await productsService.findAllWithGroup();
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
