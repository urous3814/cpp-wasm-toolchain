#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> scores;
    scores["alice"] = 10;
    scores["bob"] = 20;
    scores["carol"] = 30;
    for (const auto& pair : scores) {
        std::cout << pair.first << ":" << pair.second << "\n";
    }
    return 0;
}
