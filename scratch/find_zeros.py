
def find_zero_balance(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    count = 0
    for line_no, line in enumerate(lines, 1):
        for char in line:
            if char == '{':
                count += 1
            elif char == '}':
                count -= 1
            
            if count == 0:
                print(f"Balance hit 0 on line {line_no}")
                print(f"Line content: {line.strip()}")
                # Don't return, find all zeros
    
find_zero_balance('frontend/api-service.js')
