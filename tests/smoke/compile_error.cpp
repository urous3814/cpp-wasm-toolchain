// This file intentionally contains a compile error.
// smoke-test.sh expects a non-empty error message, not a crash.

int main() {
    int x = "not an int";  // type error
    return 0;
}
