with open(r"d:\Foregin Project\movex-driver-app\src\screens\OrderDetailsScreen.js", "rb") as f:
    f.seek(0, 2)
    size = f.tell()
    f.seek(max(0, size - 100))
    print(repr(f.read()))
