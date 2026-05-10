
import re

def scrub_api_service(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Remove broken getProducts fragment
    content = re.sub(r'\s+` : "/products";\s+return await this\.makeRequest\(endpoint\);\s+\} catch \(error\) \{\s+throw error;\s+\}\s+\}', '', content)
    
    # 2. Remove broken getCampaigns fragment
    content = re.sub(r'\s+` : "/campaigns";\s+return await this\.makeRequest\(endpoint\);\s+\} catch \(error\) \{\s+console\.warn\("❌ Failed to fetch campaigns:", error\);\s+\.campaigns;\s+return \[\];\s+\}\s+\}', '', content)
    
    # 3. Remove broken searchGroups fragment
    content = re.sub(r'\s+\)\.toString\(\);\s+return await this\.makeRequest\(`/clubs\?\$\{queryString\}`\);\s+\} catch \(error\) \{\s+console\.error\("Failed to search groups:", error\);\s+throw error;\s+\}\s+\}', '', content)
    
    # 4. Remove broken delete fragment
    content = re.sub(r'\s+`, \{\s+method: "DELETE",\s+\}\);\s+\}', '', content)

    with open(filepath, 'w') as f:
        f.write(content)

scrub_api_service('frontend/api-service.js')
