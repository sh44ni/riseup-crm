import re
import glob

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # 1. Add import
    if 'apiFetch' not in text:
        text = "import { apiFetch } from '@/lib/api';\n" + text

    # 2. Remove local getAuthHeaders
    text = re.sub(r'function getAuthHeaders.*?\n}\n', '', text, flags=re.DOTALL)

    # 3. Remove local constants (BACKEND_BASE_URL, etc.)
    text = re.sub(r'const BACKEND_BASE_URL[^\n]*\n', '', text)
    text = re.sub(r'const [A-Z_]+_ENDPOINT[^\n]*\n', '', text)
    text = re.sub(r'const [A-Z_]+_URL[^\n]*\n', '', text)
    
    # 4. Remove AbortController boilerplates
    text = re.sub(r'\s*const controller = new AbortController\(\);\n', '\n', text)
    text = re.sub(r'\s*const timeoutId = setTimeout\(\(\) => controller\.abort\(\), \d+\);\n', '\n', text)
    text = re.sub(r'\s*clearTimeout\(timeoutId\);\n', '\n', text)
    text = re.sub(r'\s*signal: controller\.signal,\n?', '', text)
    
    # 5. Replace simple fetch(url, { ... }) with apiFetch
    # A bit tricky because of different methods and formats, let's just do manual repl for some, or use a broad regex
    
    # Simple GET:
    # const res = await fetch(`${BACKEND_BASE_URL}/api...`, { headers: getAuthHeaders() })
    # return res.json() etc.
    
    # Let's save the file back for now
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)

files = [
    'crm/src/api/heroBannerApi.ts',
    'crm/src/api/weatherApi.ts',
    'crm/src/api/personalTasksApi.ts',
    'crm/src/api/quoteBannerApi.ts',
    'crm/src/api/dashboardApi.ts',
    'crm/src/api/clientsApi.ts',
    'crm/src/api/jobsApi.ts',
    'crm/src/api/pipelineApi.ts'
]

for fp in files:
    try:
        process_file(fp)
        print("Processed", fp)
    except Exception as e:
        print("Failed", fp, e)
