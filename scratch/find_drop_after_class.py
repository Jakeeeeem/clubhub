
def find_balance_drop_after_class(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    count = 0
    for line_no, line in enumerate(lines, 1):
        for char in line:
            if char == '{':
                count += 1
            elif char == '}':
                count -= 1
        
        if line_no >= 2 and count < 2:
            print(f"Balance dropped below 2 on line {line_no}")
            print(f"Line content: {line.strip()}")
            return
    
find_balance_drop_after_class('frontend/api-service.js')
