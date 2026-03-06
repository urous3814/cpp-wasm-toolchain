#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v = {3, 1, 2};
    std::sort(v.begin(), v.end());
    for (int x : v) {
        std::cout << x << " ";
    }
    std::cout << std::endl;
    return 0;
}
