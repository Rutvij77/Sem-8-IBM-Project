import os

directory = 'c:/College/Semester-8/IBM Project/Project with new auth/frontend/src'

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.js') or file.endswith('.jsx'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            if '"http://localhost:5000' in content:
                new_content = content.replace('"http://localhost:5000', '(import.meta.env.VITE_API_URL || "http://localhost:5000") + "')
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file_path}")
