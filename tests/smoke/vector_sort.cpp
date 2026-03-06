#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {5, 3, 1, 4, 2};
    std::sort(v.begin(), v.end());
    for (int x : v) std::cout << x << " ";
    std::cout << "\n";
    return 0;
}
