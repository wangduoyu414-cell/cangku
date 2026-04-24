export function buildOrderKey(vendor: string, sku: string): string {
  return `${vendor.toLowerCase()}::${sku.trim().toUpperCase()}`;
}
