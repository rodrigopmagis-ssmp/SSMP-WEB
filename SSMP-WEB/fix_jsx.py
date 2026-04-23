import sys

def fix_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # We want to replace lines from roughly 1650 to 1660 with the fixed structure
    # Based on Step 759:
    # 1650: )}
    # 1651: </div>
    # 1652: )
    # 1653: })
    # 1654: )}
    # 1655: </div>
    # 1656: </>
    # 1657: )}
    # 1658: </div>
    # 1659: (blank)
    # 1660: )}
    
    # We will identify the range by lookahead/lookbehind
    # 1650 starts with '                                                            )}'
    # 1660 starts with '                    )}'
    
    start_idx = -1
    end_idx = -1
    for i, line in enumerate(lines):
        if '                                                            )}' in line and i > 1600:
            start_idx = i
        if '                    )}' in line and start_idx != -1 and i > start_idx:
            end_idx = i
            break
    
    if start_idx == -1 or end_idx == -1:
        print(f"Could not find range: start={start_idx}, end={end_idx}")
        return

    print(f"Fixing lines {start_idx+1} to {end_idx+1}")
    
    new_content = [
        '                                                            )}\n',
        '                                                        </div>\n',
        '                                                    </div>\n',
        '                                                )\n',
        '                                            })\n',
        '                                        )}\n',
        '                                    </div>\n',
        '                                </>\n',
        '                            )}\n',
        '                        </div>\n',
        '                    )}\n'
    ]
    
    lines[start_idx : end_idx+1] = new_content
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Success!")

if __name__ == "__main__":
    fix_file(sys.argv[1])
