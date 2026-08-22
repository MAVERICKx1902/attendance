# Custom Converters - v0.0.1

Place your Python conversion logic here.

## How it works
1. User uploads Excel (Input 1) in UI
2. User uploads Python file from this folder (Input 2) — e.g., `example_simple.py`
3. User chooses Output Folder (Input 3)
4. App executes Python file with `input_path` and `output_path`

## Required Function Signature
Your Python file should define ONE of these:

```python
def process(input_path, output_path): ...
def process_attendance(input_path, output_path): ...
def convert(input_path, output_path): ...
def main(): # uses global input_path/output_path
```

Example:
```python
import pandas as pd

def process(input_path, output_path):
    df = pd.read_excel(input_path)
    # ... your logic ...
    df.to_excel(output_path, index=False)
```

## Testing
```bash
python example_simple.py  # if it has __main__
# or via app:
python -c "import example_simple; example_simple.process('sample.xlsx', 'out.xlsx')"
```
