// This file intentionally contains a compile error for smoke testing.
// Expected: error about undeclared identifier or type mismatch.

int main() {
    int x = undeclared_variable;
    return x;
}
