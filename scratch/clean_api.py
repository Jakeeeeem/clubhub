
import sys

def clean_api_service(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()

    new_lines = []
    skip = False
    
    # We want to skip the garbage between _interceptDemoRequest and _handleResponse
    for line in lines:
        if "async _interceptDemoRequest(endpoint, options) {" in line:
            new_lines.append(line)
            new_lines.append("    return null;\n")
            new_lines.append("  }\n")
            skip = True
            continue
        
        if skip:
            if "async _handleResponse(response, endpoint, options) {" in line:
                skip = False
                new_lines.append("\n")
                new_lines.append(line)
            continue
        
        new_lines.append(line)

    with open(filepath, 'w') as f:
        f.writelines(new_lines)

clean_api_service('frontend/api-service.js')
