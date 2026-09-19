import os

filepath = os.path.join(os.path.dirname(__file__), 'server.js')
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''// ?"??"? DELETE STUDENT RECORD (STAFF / INSTRUCTOR / ADMIN)'''

replacement = '''// ============================================================
// AUDIT LOGS ENDPOINT (SUPER ADMIN ONLY)
// ============================================================
app.get('/api/admin/audit-logs', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    // Strict admin check
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Permission denied. Super Admin access required.' });
    }

    try {
        const logs = await readData('auditLogs.json', []);
        
        // Sort logs by timestamp descending (newest first)
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({ success: true, logs });
    } catch (e) {
        console.error('Error fetching audit logs:', e);
        res.status(500).json({ success: false, error: 'Internal server error fetching logs.' });
    }
});

// ?"??"? DELETE STUDENT RECORD (STAFF / INSTRUCTOR / ADMIN)'''

if target in content:
    content = content.replace(target, replacement)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Endpoint added to server.js successfully")
else:
    print("Target string not found in server.js")