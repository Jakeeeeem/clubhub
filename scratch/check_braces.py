
def check_braces(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    count = 0
    for i, char in enumerate(content):
        if char == '{':
            count += 1
        elif char == '}':
            count -= 1
        
        if count < 0:
            print(f"Excess closing brace at index {i}")
            # Find line number
            line_no = content.count('\n', 0, i) + 1
            print(f"Line number: {line_no}")
            # Show snippet
            start = max(0, i - 50)
            end = min(len(content), i + 50)
            print(f"Snippet: {content[start:end]}")
            return False
            
    if count > 0:
        print(f"Unclosed open braces: {count}")
        return False
    
    print("Braces are balanced.")
    return True

check_braces('frontend/api-service.js')
