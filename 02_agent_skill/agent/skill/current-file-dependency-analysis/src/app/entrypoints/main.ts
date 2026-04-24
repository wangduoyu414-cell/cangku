import { createOrder } from "../application/use-cases";
import { readFileSync } from "fs";

export function runTsEntrypoint(): string {
  const raw = readFileSync("configs/base/app.yaml", "utf8");
  const order = createOrder("TSVendor", "abc-001");
  return `${order.orderKey}:${raw.length}`;
}
