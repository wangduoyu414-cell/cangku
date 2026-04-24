import { buildOrderKey } from "../domain/order-service";

export function fetchOrderKey(vendor: string, sku: string): string {
  return buildOrderKey(vendor, sku);
}
