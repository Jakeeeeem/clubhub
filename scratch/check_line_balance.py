
def get_balance_at_line(filepath, target_line):
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    count = 0
    for line_no, line in enumerate(lines, 1):
        for char in line:
            if char == '{':
                count += 1
            elif char == '}':
                count -= 1
        
        if line_no == target_line:
            return count
    return count

print(f"Balance at 2785: {get_balance_at_line('frontend/api-service.js', 2785)}")
print(f"Balance at 2786: {get_balance_at_line('frontend/api-service.js', 2786)}")
print(f"Balance at 2789: {get_balance_at_line('frontend/api-service.js', 2789)}")
