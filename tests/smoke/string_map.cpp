#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> scores;
    scores["alice"] = 95;
    scores["bob"] = 82;
    for (const auto& [name, score] : scores) {
        std::cout << name << ": " << score << "\n";
    }
    return 0;
}
