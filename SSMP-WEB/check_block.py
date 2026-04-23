import sys
import re

def check_block(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    # extract lines 1321 to 1653
    content = "".join(lines[1320:1653])
    
    # Very simple stack based on <tag> and </tag>
    # We will ignore <br/>, <input/>, <Icon />, <textarea />
    tags = re.findall(r'<\/?([a-zA-Z0-9]+)[^>]*>', content)
    stack = []
    
    self_closing = ['input', 'br', 'hr', 'img', 'Icon', 'CRMFollowupSequence', 'InfoItem']
    
    for match in re.finditer(r'<\/?([a-zA-Z0-9]+)[^>]*>', content):
        tag_full = match.group(0)
        tag_name = match.group(1)
        
        # skip self-closing completely
        if tag_full.endswith('/>') or tag_name in self_closing:
            continue
            
        if tag_full.startswith('</'):
            if stack and stack[-1] == tag_name:
                stack.pop()
            else:
                print(f"Error: unmatched closing tag {tag_full} at {match.start()}")
        else:
            stack.append(tag_name)
            
    print("Unclosed tags remaining in stack (bottom to top):")
    for t in stack:
        print(f"  <{t}>")

if __name__ == "__main__":
    check_block(sys.argv[1])
