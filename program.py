a = 10
b == 20

def swap():
    global a,b
    a, b =b,a
swap()
print(a)
print(b)