#!/usr/bin/env python3
"""
Convert Landsraad HTML rules to numbered markdown files.

This script parses the HTML rules file and converts each major section
(0, 1, 2, 3, 4) into separate numbered markdown files with correct numbering.
"""

import re
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Tag
from typing import List, Optional, Dict


def clean_text(text: str) -> str:
    """Clean text by removing extra whitespace."""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def is_hidden(element) -> bool:
    """Check if element or any parent has display: none."""
    if not isinstance(element, Tag):
        return False
    
    current = element
    while current:
        if isinstance(current, Tag):
            style = current.get('style', '')
            # Check for display: none or display:none (with or without space)
            if 'display' in style.lower() and 'none' in style.lower():
                # More precise check
                if re.search(r'display\s*:\s*none', style, re.IGNORECASE):
                    return True
        # Navigate to parent
        current = getattr(current, 'parent', None)
        # Stop at document root
        if current is None or current.name == '[document]':
            break
    
    return False


def get_text_content(element, skip_links: bool = False, exclude_nested_lists: bool = True) -> str:
    """Extract text content from element, handling various tags."""
    if isinstance(element, NavigableString):
        return str(element)
    
    if not isinstance(element, Tag):
        return ""
    
    # Skip hidden elements (check element and all parents)
    if is_hidden(element):
        return ""
    
    # Skip notclassic elements
    classes = element.get('class', [])
    if 'notclassic' in classes:
        return ""
    
    text_parts = []
    
    for child in element.children:
        if isinstance(child, NavigableString):
            text_parts.append(str(child))
        elif isinstance(child, Tag):
            # Skip nested lists if requested
            if exclude_nested_lists and child.name in ['ol', 'ul']:
                continue
            
            if child.name == 'a':
                if skip_links:
                    # Just get text, skip the link
                    text_parts.append(get_text_content(child, skip_links=True, exclude_nested_lists=exclude_nested_lists))
                else:
                    # Check if it's a cross-reference link
                    href = child.get('href', '')
                    link_classes = child.get('class', [])
                    if 'addendum_link' in link_classes or 'supersede_link' in link_classes:
                        # This is a cross-reference, we'll handle it separately
                        text_parts.append(get_text_content(child, skip_links=True, exclude_nested_lists=exclude_nested_lists))
                    elif 'rules#' in href:
                        # Internal link, just get text
                        text_parts.append(get_text_content(child, skip_links=True, exclude_nested_lists=exclude_nested_lists))
                    else:
                        text_parts.append(get_text_content(child, skip_links=True, exclude_nested_lists=exclude_nested_lists))
            elif child.name == 'p' and 'example' in child.get('class', []):
                # Skip example paragraphs
                pass
            elif child.name in ['b', 'strong', 'i', 'em', 'span']:
                text_parts.append(get_text_content(child, skip_links=skip_links, exclude_nested_lists=exclude_nested_lists))
            else:
                text_parts.append(get_text_content(child, skip_links=skip_links, exclude_nested_lists=exclude_nested_lists))
    
    return clean_text(''.join(text_parts))


def extract_cross_references(element: Tag) -> str:
    """Extract cross-reference annotations (+X.XX.XX or -X.XX.XX)."""
    refs = []
    seen_refs = set()  # Track to avoid duplicates
    
    for link in element.find_all('a', class_=lambda x: x and ('addendum_link' in x or 'supersede_link' in x)):
        # Skip hidden links (check element and all parents)
        if is_hidden(link):
            continue
        if 'notclassic' in link.get('class', []):
            continue
        
        href = link.get('href', '')
        if 'rules#' not in href:
            continue
        
        # The rule number is usually in the link text itself
        link_text = get_text_content(link, skip_links=True, exclude_nested_lists=True)
        
        # Look for pattern like +2.01.03 or -3.01.11
        rule_match = re.search(r'([+-]?\d+\.\d+(?:\.\d+)*)', link_text)
        if rule_match:
            ref = rule_match.group(1)
            # Ensure it has + or - prefix
            if not ref.startswith(('+', '-')):
                prefix = '+' if 'addendum_link' in link.get('class', []) else '-'
                ref = f"{prefix}{ref}"
            # Avoid duplicates
            if ref not in seen_refs:
                refs.append(ref)
                seen_refs.add(ref)
    
    return ' '.join(refs) if refs else ''


def format_rule_number(section: str, subsection: Optional[str], rule: int, 
                      subrules: List[int]) -> str:
    """Format a rule number like 1.02.03 or 1.06.05.04."""
    parts = [section]
    if subsection:
        parts.append(subsection)
    parts.append(f"{rule:02d}")
    # Zero-pad subrules: 1.06.05.01, 1.06.05.02, etc.
    parts.extend([f"{sr:02d}" for sr in subrules])
    return '.'.join(parts)


def process_li(li: Tag, section: str, subsection: Optional[str], 
               rule_num: int, subrule_path: List[int], 
               is_intro: bool = False) -> List[str]:
    """Process a list item and return formatted rule lines."""
    
    # Skip hidden items (check element and all parents)
    if is_hidden(li):
        return []
    if 'notclassic' in li.get('class', []):
        return []
    
    lines = []
    
    # Determine rule number
    # Intro items should be numbered as .00 (whether in subsection or nested)
    if is_intro:
        if subsection:
            if subrule_path:
                # Nested intro item with subrules: 3.01.11.05.00 (use parent path + 00)
                # Build number from parent path, ending with 00
                parts = [section, subsection, f"{rule_num:02d}"]
                parts.extend([f"{sr:02d}" for sr in subrule_path])
                parts.append("00")
                rule_number = '.'.join(parts)
            elif rule_num > 0:
                # Nested intro item at first level: 3.01.11.00
                rule_number = f"{section}.{subsection}.{rule_num:02d}.00"
            else:
                # Subsection intro: 1.07.00
                rule_number = f"{section}.{subsection}.00"
        else:
            # Top-level intro: 0.00
            if section == "0" and rule_num == 0:
                rule_number = "0.00"
            else:
                rule_number = None
    elif subsection:
        if subrule_path:
            rule_number = format_rule_number(section, subsection, rule_num, subrule_path)
        else:
            rule_number = f"{section}.{subsection}.{rule_num:02d}"
    else:
        if subrule_path:
            rule_number = format_rule_number(section, None, rule_num, subrule_path)
        else:
            rule_number = f"{section}.{rule_num:02d}"
    
    # Get text content - exclude nested lists
    text = get_text_content(li, skip_links=False, exclude_nested_lists=True)
    
    # Get cross-references
    cross_refs = extract_cross_references(li)
    if cross_refs:
        text = f"{text} {cross_refs}"
    
    if text:
        if rule_number:
            lines.append(f"{rule_number} {text}")
        else:
            # Intro items don't get numbered
            lines.append(text)
    
    # Process nested lists
    nested_ol = li.find('ol', recursive=False)
    if nested_ol:
        # Skip if nested list is hidden
        if is_hidden(nested_ol):
            return lines
        nested_items = nested_ol.find_all('li', recursive=False)
        # Check if first item should be skipped (intro text without anchor)
        skip_first_nested = False
        if nested_items:
            first_nested = nested_items[0]
            first_nested_text = get_text_content(first_nested, skip_links=True, exclude_nested_lists=True).lower()
            has_anchor = first_nested.find('a', {'name': True}) is not None
            is_intro_pattern = (
                'this section' in first_nested_text or 
                'lists all' in first_nested_text or 
                ('play at' in first_nested_text and 'anytime' in first_nested_text and ('options' in first_nested_text or 'one of these' in first_nested_text)) or
                ('on your' in first_nested_text and 'action' in first_nested_text and 'adhere' in first_nested_text) or
                first_nested_text.startswith('play at anytime')
            )
            if not has_anchor and is_intro_pattern:
                skip_first_nested = True
        
        nested_idx = 0
        for idx, nested_li in enumerate(nested_items):
            # Skip hidden nested items
            if is_hidden(nested_li):
                continue
            
            if skip_first_nested and idx == 0:
                # Intro text items should be numbered as .00
                # Pass the current subrule_path so it becomes 3.01.11.00
                nested_lines = process_li(
                    nested_li, section, subsection, rule_num,
                    subrule_path,  # Don't add [0], let intro logic handle it
                    is_intro=True  # Mark as intro so it gets .00
                )
                lines.extend(nested_lines)
                continue
            
            nested_idx += 1
            nested_lines = process_li(
                nested_li, section, subsection, rule_num,
                subrule_path + [nested_idx], 
                is_intro='intro' in nested_li.get('class', [])
            )
            lines.extend(nested_lines)
    
    return lines


def process_section(section: Tag, section_num: str) -> str:
    """Process a major section and return markdown."""
    lines = []
    
    # Get title
    h2 = section.find('h2')
    if h2:
        title = get_text_content(h2, skip_links=True)
        lines.append(f"# {title}\n")
    
    # Find main ordered list
    main_ol = section.find('ol')
    if not main_ol:
        return '\n'.join(lines)
    
    # Skip if main list is hidden
    if is_hidden(main_ol):
        return '\n'.join(lines)
    
    # Get start number
    start_attr = main_ol.get('start')
    start_num = int(start_attr) if start_attr and start_attr.isdigit() else 1
    
    # Process top-level items
    top_items = main_ol.find_all('li', recursive=False)
    item_counter = start_num
    
    for item in top_items:
        # Skip hidden items
        if is_hidden(item):
            continue
        
        classes = item.get('class', [])
        
        # Handle suppressed number items (like 1.00.xx intro section)
        if 'supress_number' in classes:
            nested_ol = item.find('ol', recursive=False)
            if nested_ol and not is_hidden(nested_ol):
                nested_items = nested_ol.find_all('li', recursive=False)
                for idx, nested_item in enumerate(nested_items):
                    # Skip hidden nested items
                    if is_hidden(nested_item):
                        continue
                    is_intro = idx == 0 and 'intro' in nested_item.get('class', [])
                    if section_num == "1":
                        # Special handling for 1.00.xx
                        rule_lines = process_li(
                            nested_item, section_num, "00", idx, [],
                            is_intro=is_intro
                        )
                        # Fix numbering to be 1.00.00, 1.00.01, etc.
                        for i, line in enumerate(rule_lines):
                            if line.startswith("1."):
                                if idx == 0:
                                    rule_lines[i] = re.sub(r'^1\.00\.\d+', '1.00.00', line)
                                else:
                                    rule_lines[i] = re.sub(r'^1\.00\.\d+', f'1.00.{idx:02d}', line)
                        lines.extend(rule_lines)
                    else:
                        rule_lines = process_li(nested_item, section_num, None, idx, [], is_intro=is_intro)
                        lines.extend(rule_lines)
            continue
        
        # Handle subsection headers
        if 'subsection_header' in classes:
            h3 = item.find('h3')
            if h3:
                subsection_title = get_text_content(h3, skip_links=True)
                subsection_num = f"{item_counter:02d}"
                lines.append(f"\n## {section_num}.{subsection_num} {subsection_title}\n")
                
                # Process nested list
                nested_ol = item.find('ol', recursive=False)
                if nested_ol and not is_hidden(nested_ol):
                    nested_items = nested_ol.find_all('li', recursive=False)
                    nested_counter = 0
                    # Check if first item is intro text that shouldn't be counted
                    first_item = nested_items[0] if nested_items else None
                    skip_first = False
                    if first_item:
                        first_text = get_text_content(first_item, skip_links=True, exclude_nested_lists=True).lower()
                        # Check if it's intro text (no anchor name, or contains phrases like "this section", "play at anytime")
                        anchor_with_name = first_item.find('a', {'name': True})
                        has_anchor_name = anchor_with_name is not None
                        # Check for common intro patterns - be more lenient with matching
                        is_intro_text = (
                            'this section' in first_text or 
                            'lists all' in first_text or 
                            ('play at' in first_text and 'anytime' in first_text and ('options' in first_text or 'one of these' in first_text)) or
                            ('on your' in first_text and 'action' in first_text and 'adhere' in first_text) or
                            first_text.startswith('play at anytime')
                        )
                        if not has_anchor_name and is_intro_text:
                            # This is intro text, skip it from numbering
                            skip_first = True
                    
                    for idx, nested_item in enumerate(nested_items):
                        # Skip hidden nested items
                        if is_hidden(nested_item):
                            continue
                        
                        is_intro = 'intro' in nested_item.get('class', [])
                        if skip_first and idx == 0:
                            # Intro text items should be numbered as .00
                            rule_lines = process_li(
                                nested_item, section_num, subsection_num, 0, [],
                                is_intro=True  # Mark as intro so it gets .00
                            )
                            lines.extend(rule_lines)
                            continue
                        elif is_intro:
                            # Intro items in subsections get .00
                            rule_lines = process_li(
                                nested_item, section_num, subsection_num, 0, [],
                                is_intro=True
                            )
                        else:
                            nested_counter += 1
                            rule_lines = process_li(
                                nested_item, section_num, subsection_num, nested_counter, [],
                                is_intro=False
                            )
                        lines.extend(rule_lines)
            
            item_counter += 1
            continue
        
        # Regular list item
        is_intro = 'intro' in classes
        # For section 0, intro items should be numbered (0.00)
        # For other sections, check if it's the first item and has intro class
        if is_intro and section_num == "0" and item_counter == start_num:
            # This is 0.00
            rule_lines = process_li(item, section_num, None, 0, [], is_intro=True)
        else:
            rule_lines = process_li(item, section_num, None, item_counter, [], is_intro=is_intro)
        lines.extend(rule_lines)
        item_counter += 1
    
    return '\n'.join(lines)


def main():
    """Main conversion function."""
    # Check for BeautifulSoup4
    try:
        import bs4
    except ImportError:
        print("Error: beautifulsoup4 is required.")
        print("Install it with: pip install beautifulsoup4")
        return
    
    html_file = Path("/Users/ralf/Downloads/Landsraad of Las Vegas - Classic Rules.html")
    output_dir = Path("/Users/ralf/Documents/prj/exploration/coding/nextjs/dune-bench/numbered_rules")
    
    if not html_file.exists():
        print(f"Error: HTML file not found at {html_file}")
        return
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Reading HTML file: {html_file}")
    with open(html_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Find all major sections
    sections = soup.find_all('section', class_='page-break')
    
    section_map = {
        'setupgame': '0',
        'phases': '1',
        'factions': '2',
        'treachery': '3',
        'variants': '4'
    }
    
    for section in sections:
        section_id = section.get('id', '')
        data_listindex = section.get('data-listindex')
        
        # Determine section number
        section_num = None
        if data_listindex is not None:
            section_num = str(data_listindex)
        else:
            for key, num in section_map.items():
                if key in section_id:
                    section_num = num
                    break
        
        if not section_num:
            print(f"Skipping section with id: {section_id}")
            continue
        
        print(f"Processing section {section_num} ({section_id})...")
        
        markdown = process_section(section, section_num)
        
        output_file = output_dir / f"{section_num}.md"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(markdown)
        
        print(f"  Written {len(markdown.splitlines())} lines to {output_file}")
    
    print("\nConversion complete!")


if __name__ == '__main__':
    main()
