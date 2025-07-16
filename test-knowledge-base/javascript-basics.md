---
title: JavaScript 基础知识
tags: [javascript, programming]
---

# JavaScript 基础知识

## 变量声明

JavaScript 中有三种声明变量的方式：

### var
- 函数作用域
- 可以重复声明
- 存在变量提升

```javascript
var name = 'John';
var name = 'Jane'; // 可以重复声明
```

### let
- 块级作用域
- 不能重复声明
- 不存在变量提升

```javascript
let age = 25;
// let age = 30; // 错误：不能重复声明
```

### const
- 块级作用域
- 不能重复声明
- 不能重新赋值
- 声明时必须初始化

```javascript
const PI = 3.14159;
// PI = 3.14; // 错误：不能重新赋值
```

## 数据类型

### 基本类型
- Number：数字
- String：字符串
- Boolean：布尔值
- Undefined：未定义
- Null：空值
- Symbol：符号（ES6）
- BigInt：大整数（ES2020）

### 引用类型
- Object：对象
- Array：数组
- Function：函数
- Date：日期
- RegExp：正则表达式

## 函数

### 函数声明
```javascript
function greet(name) {
    return `Hello, ${name}!`;
}
```

### 函数表达式
```javascript
const greet = function(name) {
    return `Hello, ${name}!`;
};
```

### 箭头函数
```javascript
const greet = (name) => `Hello, ${name}!`;
```