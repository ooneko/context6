---
title: Python 编程技巧
tags: [python, programming, tips]
---

# Python 编程技巧

## 列表推导式

列表推导式是 Python 中创建列表的简洁方法：

```python
# 传统方法
squares = []
for i in range(10):
    squares.append(i**2)

# 列表推导式
squares = [i**2 for i in range(10)]

# 带条件的列表推导式
even_squares = [i**2 for i in range(10) if i % 2 == 0]
```

## 字典推导式

```python
# 创建字典
word_lengths = {word: len(word) for word in ['python', 'javascript', 'rust']}
# 结果: {'python': 6, 'javascript': 10, 'rust': 4}
```

## 使用 enumerate

在遍历列表时获取索引：

```python
fruits = ['apple', 'banana', 'orange']

# 不推荐
for i in range(len(fruits)):
    print(f"{i}: {fruits[i]}")

# 推荐
for i, fruit in enumerate(fruits):
    print(f"{i}: {fruit}")
```

## 使用 zip

同时遍历多个列表：

```python
names = ['Alice', 'Bob', 'Charlie']
ages = [25, 30, 35]
cities = ['New York', 'London', 'Paris']

for name, age, city in zip(names, ages, cities):
    print(f"{name} is {age} years old and lives in {city}")
```

## 使用 f-strings

Python 3.6+ 的格式化字符串：

```python
name = "Python"
version = 3.11

# f-string
print(f"{name} {version} is awesome!")

# 支持表达式
print(f"2 + 2 = {2 + 2}")

# 格式化
pi = 3.14159
print(f"Pi: {pi:.2f}")
```

## 上下文管理器

使用 with 语句自动管理资源：

```python
# 文件操作
with open('file.txt', 'r') as f:
    content = f.read()
# 文件自动关闭

# 自定义上下文管理器
from contextlib import contextmanager

@contextmanager
def timer():
    import time
    start = time.time()
    yield
    print(f"Elapsed: {time.time() - start:.2f}s")

with timer():
    # 执行一些操作
    time.sleep(1)
```