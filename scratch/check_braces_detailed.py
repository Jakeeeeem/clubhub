
def check_braces_detailed(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    count = 0
    for line_no, line in enumerate(lines, 1):
        for char in line:
            if char == '{':
                count += 1
            elif char == '}':
                count -= 1
            
            if count < 0:
                print(f"Excess closing brace on line {line_no}")
                print(f"Line content: {line.strip()}")
                return False
    
    if count != 0:
        print(f"Final balance: {count}")
        return False
    
    print("Balanced!")
    return True

check_braces_detailed('frontend/api-service.js')
