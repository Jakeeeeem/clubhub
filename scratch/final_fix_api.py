
import re

def final_fix_api_service(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Remove broken comma/list fragments inside try blocks
    # e.g. try { , { ... } ] ; }
    content = re.sub(r'try\s*\{\s*,\s*\[?\{.*?\}\s*\]?\s*;\s*\}', 'try { ; }', content, flags=re.DOTALL)
    
    # 2. Remove broken objects that were left behind
    content = re.sub(r',\s*\{\s*id:\s*"p[0-9]".*?\}\s*', '', content, flags=re.DOTALL)
    
    # 3. Fix the specific getProducts broken structure
    # async getProducts(groupId) { try { , ... } catch ... }
    # Let's just make getProducts simple:
    content = re.sub(r'async getProducts\(groupId\) \{.*?\}', 'async getProducts(groupId) {\n    try {\n      return await this.makeRequest(`/clubs/${groupId}/products`);\n    } catch (error) {\n      console.warn("❌ Failed to fetch products:", error);\n      return [];\n    }\n  }', content, flags=re.DOTALL)
    
    # Do same for getCampaigns
    content = re.sub(r'async getCampaigns\(groupId\) \{.*?\}', 'async getCampaigns(groupId) {\n    try {\n      return await this.makeRequest(`/clubs/${groupId}/campaigns`);\n    } catch (error) {\n      console.warn("❌ Failed to fetch campaigns:", error);\n      return [];\n    }\n  }', content, flags=re.DOTALL)

    # 4. Remove any other naked commas after try {
    content = re.sub(r'try\s*\{\s*,', 'try {', content)

    with open(filepath, 'w') as f:
        f.write(content)

final_fix_api_service('frontend/api-service.js')
