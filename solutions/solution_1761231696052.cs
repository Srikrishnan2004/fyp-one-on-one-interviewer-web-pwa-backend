// Welcome to C# coding practice!
using System;

class Program {
    static int Fibonacci(int n) {
        if (n <= 1) return n;
        return Fibonacci(n - 1) + Fibonacci(n - 2);
    }
    
    static void Main() {
        Console.WriteLine("Fibonacci sequence:");
        for (int i = 0; i < 10; i++) {
            Console.WriteLine($"F({i}) = {Fibonacci(i)}");
        }
    }
}