package main

import (
	"fmt"

	"example.com/generic-template-repo/src/app/shared/gohelper"
)

func main() {
	fmt.Println(gohelper.NormalizeSKU(" abc-999 "))
}
