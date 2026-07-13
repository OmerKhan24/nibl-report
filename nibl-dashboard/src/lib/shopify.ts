/**
 * Server-only Shopify API helper
 * Called from Next.js API routes only
 */

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'b124aa-2.myshopify.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || '';

export async function fetchShopifyOrders(from?: string | null, to?: string | null): Promise<any[]> {
  if (!SHOPIFY_ACCESS_TOKEN) {
    console.warn('SHOPIFY_ACCESS_TOKEN is missing. Returning empty B2C orders.');
    return [];
  }

  const url = new URL(`https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-04/orders.json`);
  url.searchParams.set('status', 'any');
  url.searchParams.set('limit', '250'); // Max limit per page

  if (from) {
    // Add Pakistan timezone offset so it strictly aligns with your local day
    url.searchParams.set('created_at_min', `${from}T00:00:00+05:00`);
  }
  if (to) {
    url.searchParams.set('created_at_max', `${to}T23:59:59+05:00`);
  }

  try {
    let orders: any[] = [];
    let nextUrl: string | null = url.toString();

    // Handle pagination if more than 250 orders
    while (nextUrl) {
      const response: Response = await fetch(nextUrl, {
        cache: 'no-store', // CRITICAL: bypass Next.js Data Cache
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.statusText}`);
      }

      const data = await response.json();
      orders = orders.concat(data.orders);

      // Pagination via Link header (RFC 5988)
      const linkHeader = response.headers.get('link');
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        nextUrl = match ? match[1] : null;
      } else {
        nextUrl = null;
      }
    }

    return orders;
  } catch (error) {
    console.error('Error fetching Shopify orders:', error);
    return [];
  }
}
