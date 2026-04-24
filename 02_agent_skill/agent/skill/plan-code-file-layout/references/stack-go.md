# Stack: Go

Treat this as a strong override when Go packages define the main boundary.

## Bias

- Package cohesion matters more than file count.
- A small package with a few files is often healthier than many tiny packages.

## Split When

- The package has clearly separate handler, domain, and external adapter concerns.
- The public API surface is getting hard to scan.
- Import pressure or package cycles point to the wrong package boundary.

## Keep Inline

- Local helpers
- Simple structs used only within one package slice
- Small validation or mapping helpers

## Avoid

- Creating interfaces before there are multiple meaningful consumers
- Splitting packages or files only for abstract purity
- Spreading one flow across many files inside the same package without clear ownership gain
