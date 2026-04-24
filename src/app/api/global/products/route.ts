import { NextResponse } from 'next/server';
import * as globalProductsService from '@/lib/services/global-products';
import { handleApiError } from '@/lib/api-error';

export async function GET() {
  try {
    const products = await globalProductsService.findAllWithGroup();
    return NextResponse.json(products);
  } catch (error) {
    return handleApiError(error, 'GET /global/products');
  }
}
