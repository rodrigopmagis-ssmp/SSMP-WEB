import sys
import re

def check_structure(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We want to trace JSX tags and Brackets
    # This is a very simple tokenizer
    tokens = re.findall(r'<div[^>]*>|</div>|<>|</>|\{|\}|\(|\)', content)
    
    stack = []
    for token in tokens:
        if token.startswith('<div'):
            stack.append(('div', token))
        elif token == '<>':
            stack.append(('fragment', token))
        elif token == '{':
            stack.append(('brace', token))
        elif token == '(':
            stack.append(('paren', token))
        elif token == '</div>':
            if not stack or stack[-1][0] != 'div':
                print(f"Error: </div> closes {stack[-1] if stack else 'nothing'}")
                # return
            else:
                stack.pop()
        elif token == '</>':
            if not stack or stack[-1][0] != 'fragment':
                print(f"Error: </> closes {stack[-1] if stack else 'nothing'}")
                # return
            else:
                stack.pop()
        elif token == '}':
            if not stack or stack[-1][0] != 'brace':
                print(f"Error: }} closes {stack[-1] if stack else 'nothing'}")
                # return
            else:
                stack.pop()
        elif token == ')':
            if not stack or stack[-1][0] != 'paren':
                print(f"Error: ) closes {stack[-1] if stack else 'nothing'}")
                # return
            else:
                stack.pop()
    
    if stack:
        print("Unclosed items:")
        for item in stack:
            print(f"  {item}")
    else:
        print("Perfectly balanced structure!")

if __name__ == "__main__":
    check_structure(sys.argv[1])
