
def find_balance_drop(filepath, threshold):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    count = 0
    for line_no, line in enumerate(lines, 1):
        for char in line:
            if char == '{':
                count += 1
            elif char == '}':
                count -= 1
            
            if count < threshold:
                print(f"Balance dropped below {threshold} on line {line_no}")
                print(f"Line content: {line.strip()}")
                return
    
find_balance_drop('frontend/api-service.js', 2)
