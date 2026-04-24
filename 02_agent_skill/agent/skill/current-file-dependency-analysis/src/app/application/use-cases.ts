import { buildOrderKey } from "../domain/order-service";

export function createOrder(vendor: string, sku: string): { orderKey: string } {
  return { orderKey: buildOrderKey(vendor, sku) };
}
