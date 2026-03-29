import { NextResponse } from 'next/server';
import * as productsService from '@/lib/services/products';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const products = await productsService.findAllWithGroup();
    return NextResponse.json(products);
  } catch (error) {
    return handleApiError(error, 'GET /products');
  }
}
