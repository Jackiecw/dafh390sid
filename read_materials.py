import os
import zipfile
import xml.etree.ElementTree as ET
import pandas as pd

def read_docx(file_path):
    try:
        with zipfile.ZipFile(file_path) as zf:
            xml_content = zf.read('word/document.xml')
        tree = ET.fromstring(xml_content)
        text = []
        for elem in tree.iter():
            if elem.tag.endswith('t'):
                if elem.text:
                    text.append(elem.text)
            elif elem.tag.endswith('p'):
                text.append('\n')
        return "".join(text)
    except Exception as e:
        return f"Error reading docx: {e}"

def read_xlsx(file_path):
    try:
        df = pd.read_excel(file_path)
        return f"Columns: {list(df.columns)}\nShape: {df.shape}\nHead:\n{df.head().to_string()}"
    except Exception as e:
        return f"Error reading xlsx: {e}"

base_path = r"d:\Code\internal-site\资料"
files = ["方案.docx", "TK-7.xlsx", "xp-1.xlsx"]

for f in files:
    path = os.path.join(base_path, f)
    if f.endswith(".docx"):
        content = read_docx(path)
        with open("proposal_content.txt", "w", encoding="utf-8") as out:
            out.write(content)
    elif f.endswith(".xlsx"):
        content = read_xlsx(path)
        with open(f"{f}_summary.txt", "w", encoding="utf-8") as out:
            out.write(content)

