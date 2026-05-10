
import sys

def fix_api_service(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    new_lines = []
    in_intercept = False
    brace_count = 0
    
    # We want to replace the body of _interceptDemoRequest with a simple return null
    # It starts at line 407 (0-indexed 406)
    
    for i, line in enumerate(lines):
        if "_interceptDemoRequest(endpoint, options) {" in line:
            in_intercept = True
            new_lines.append(line)
            new_lines.append("    return null;\n")
            brace_count = 1
            continue
        
        if in_intercept:
            brace_count += line.count('{')
            brace_count -= line.count('}')
            if brace_count <= 0:
                in_intercept = False
                new_lines.append("  }\n")
            continue
        
        new_lines.append(line)

    with open(filepath, 'w') as f:
        f.writelines(new_lines)

fix_api_service('frontend/api-service.js')
