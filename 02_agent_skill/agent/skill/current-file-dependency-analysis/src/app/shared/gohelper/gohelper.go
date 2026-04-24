package gohelper

import "strings"

func NormalizeSKU(sku string) string {
	return strings.ToUpper(strings.TrimSpace(sku))
}
