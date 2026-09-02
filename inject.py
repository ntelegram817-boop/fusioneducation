import os

firebase_scripts = """
    <!-- Firebase Compat SDKs -->
    <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
    <!-- Firebase Configuration -->
    <script src="{prefix}assets/js/firebase-config.js"></script>
"""

def inject_scripts(root_dir):
    for dirpath, _, filenames in os.walk(root_dir):
        if "node_modules" in dirpath or ".git" in dirpath:
            continue
        for filename in filenames:
            if filename.endswith(".html"):
                filepath = os.path.join(dirpath, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                if "firebase-app-compat.js" not in content:
                    depth = dirpath.replace(root_dir, "").count(os.sep)
                    prefix = "../" * depth if depth > 0 else "./"
                    scripts_to_inject = firebase_scripts.replace("{prefix}", prefix)
                    
                    content = content.replace("</body>", scripts_to_inject + "</body>")
                    
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(content)
                    print(f"Injected into {filepath}")

inject_scripts(os.getcwd())
