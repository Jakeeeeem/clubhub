
def find_first_zero(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    count = 0
    for i, char in enumerate(content):
        if char == '{':
            count += 1
        elif char == '}':
            count -= 1
        
        if count == 0:
            line_no = content.count('\n', 0, i) + 1
            print(f"Balance hit 0 on line {line_no}")
            print(f"Context: {content[i-50:i+50]}")
            return
    
find_first_zero('frontend/api-service.js')
