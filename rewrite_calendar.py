import re

with open('crm/src/api/calendarApi.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Add import
if 'apiFetch' not in text:
    text = "import { apiFetch } from '@/lib/api';\n" + text

# Remove constants and getAuthHeaders
text = re.sub(r'const BACKEND_BASE_URL[^\n]*\n', '', text)
text = re.sub(r'const CALENDAR_ENDPOINT[^\n]*\n', '', text)
text = re.sub(r'const TASKS_ENDPOINT[^\n]*\n', '', text)
text = re.sub(r'function getAuthHeaders.*?\n}\n', '', text, flags=re.DOTALL)

# Refactor fetchCalendarEventsFromBackend
text = re.sub(
r'''\s*const controller = new AbortController\(\);
\s*const timeoutId = setTimeout\(\(\) => controller\.abort\(\), \d+\);

\s*const query = new URLSearchParams\(\);
(.*?)
\s*const url = query\.toString\(\) \? `\$\{CALENDAR_ENDPOINT\}\?\$\{query\.toString\(\)\}` : CALENDAR_ENDPOINT;

\s*const res = await fetch\(url, \{
\s*method: 'GET',
\s*headers: getAuthHeaders\(\),
\s*signal: controller\.signal,
\s*\}\);

\s*clearTimeout\(timeoutId\);

\s*if \(!res\.ok\) \{
\s*// Fallback to /events endpoint if primary is unreachable
\s*return await fetchLegacyCalendarEvents\(params\);
\s*\}

\s*const json = await res\.json\(\);
\s*const rawList = Array\.isArray\(json\.data\) \? json\.data : \(Array\.isArray\(json\.events\) \? json\.events : null\);
\s*return rawList;''',
r'''
    const query = new URLSearchParams();
\1
    const qs = query.toString() ? `?${query.toString()}` : '';
    try {
      const json = await apiFetch<CalendarEventsApiResponse>(`/admin/calendar${qs}`);
      return Array.isArray(json.data) ? json.data : (Array.isArray(json.events) ? json.events : null);
    } catch {
      return await fetchLegacyCalendarEvents(params);
    }''', text, flags=re.DOTALL)

# Refactor fetchLegacyCalendarEvents
text = re.sub(
r'''\s*const res = await fetch\(`\$\{BACKEND_BASE_URL\}/api/admin/calendar/events`, \{
\s*method: 'GET',
\s*headers: getAuthHeaders\(\),
\s*\}\);
\s*if \(!res\.ok\) return null;
\s*const json = await res\.json\(\);
\s*return json\.success && Array\.isArray\(json\.data\) \? json\.data : null;''',
r'''    const json = await apiFetch<CalendarEventsApiResponse>('/admin/calendar/events');
    return json.success && Array.isArray(json.data) ? json.data : null;''', text)

# Extract and refactor simple GET functions
for func, endpoint in [
    ('fetchRegisteredUsers', '/admin/users'),
    ('fetchPipelineJobs', '/admin/leads'),
    ('fetchRealJobs', '/admin/jobs'),
    ('fetchCalendarStats', '/admin/calendar/stats'),
    ('fetchCalendarWeather', '/admin/calendar/weather')
]:
    pattern = r'''\s*const controller = new AbortController\(\);
\s*const timeoutId = setTimeout\(\(\) => controller\.abort\(\), \d+\);

\s*const res = await fetch\(`\$\{BACKEND_BASE_URL\}/api''' + endpoint + r'''`, \{
\s*method: 'GET',
\s*headers: getAuthHeaders\(\),
\s*signal: controller\.signal,
\s*\}\);

\s*clearTimeout\(timeoutId\);

\s*if \(!res\.ok\) return (\[\]|null);
\s*const json = await res\.json\(\);
\s*return json(\.[a-zA-Z]+( \|\| json\.[a-zA-Z]+)* \|\| \[\]|\.success && json\.data \? json\.data : null);'''
    
    match = re.search(pattern, text)
    if match:
        fallback = match.group(1)
        ret = match.group(2)
        repl = f'''    const json = await apiFetch<any>('{endpoint}');
    return json{ret};'''
        text = text[:match.start()] + repl + text[match.end():]

# Refactor POST tasks
text = re.sub(
r'''\s*const res = await fetch\(TASKS_ENDPOINT, \{
\s*method: 'POST',
\s*headers: getAuthHeaders\(\{ 'Content-Type': 'application/json' \}\),
\s*body: JSON\.stringify\(payload\),
\s*signal: controller\.signal,
\s*\}\);

\s*clearTimeout\(timeoutId\);

\s*if \(!res\.ok\) return null;
\s*const json = await res\.json\(\);''',
r'''    const json = await apiFetch<any>('/admin/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });''', text)

text = re.sub(r'\s*const controller = new AbortController\(\);\n\s*const timeoutId = setTimeout\(\(\) => controller\.abort\(\), \d+\);\n', '', text)

# Refactor PATCH tasks
text = re.sub(
r'''\s*const res = await fetch\(TASKS_ENDPOINT, \{
\s*method: 'PATCH',
\s*headers: getAuthHeaders\(\{ 'Content-Type': 'application/json' \}\),
\s*body: JSON\.stringify\(payload\),
\s*signal: controller\.signal,
\s*\}\);

\s*clearTimeout\(timeoutId\);
\s*return res\.ok;''',
r'''    await apiFetch<any>('/admin/tasks', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return true;''', text)

text = re.sub(
r'''\s*const res = await fetch\(`\$\{TASKS_ENDPOINT\}\?id=\$\{encodeURIComponent\(id\)\}`, \{
\s*method: 'DELETE',
\s*headers: getAuthHeaders\(\),
\s*signal: controller\.signal,
\s*\}\);

\s*clearTimeout\(timeoutId\);
\s*return res\.ok;''',
r'''    await apiFetch<any>(`/admin/tasks?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;''', text)

with open('crm/src/api/calendarApi.ts', 'w', encoding='utf-8') as f:
    f.write(text)
