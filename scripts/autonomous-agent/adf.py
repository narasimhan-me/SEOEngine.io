"""
Atlassian Document Format (ADF) parsing and building utilities.

Extracted from engine.py for modularization (Guardrails v2).
"""


def text_to_adf(text: str) -> dict:
    """Convert plain text to Atlassian Document Format.

    Preserves paragraph structure from double-newline separated text.
    """
    paragraphs = text.split('\n\n') if '\n\n' in text else [text]
    content = []

    for para in paragraphs:
        if para.strip():
            content.append({
                'type': 'paragraph',
                'content': [{'type': 'text', 'text': para.strip()}]
            })

    return {
        'type': 'doc',
        'version': 1,
        'content': content
    }


def parse_adf_to_text(adf: dict) -> str:
    """Parse Atlassian Document Format to plain text with structure preservation.

    Guardrails v1 FIXUP-2: Preserves newlines and bullets for ALLOWED FILES parsing.
    - Paragraphs/headings separated by \\n\\n
    - Bullet list items rendered as '- item\\n'
    - Hard breaks rendered as \\n
    """
    if not adf or not isinstance(adf, dict):
        return ''

    def render_inline(node) -> str:
        """Render inline content (text, marks, etc.)"""
        if isinstance(node, dict):
            node_type = node.get('type', '')
            if node_type == 'text':
                return node.get('text', '')
            elif node_type == 'hardBreak':
                return '\n'
            elif 'content' in node:
                return ''.join(render_inline(child) for child in node.get('content', []))
        return ''

    def render_block(node) -> str:
        """Render a block-level node"""
        if not isinstance(node, dict):
            return ''

        node_type = node.get('type', '')
        content = node.get('content', [])

        if node_type in ('paragraph', 'heading'):
            # Render inline content, return as block
            text = ''.join(render_inline(child) for child in content)
            return text.strip()

        elif node_type == 'bulletList':
            # Render each list item with '- ' prefix
            items = []
            for item in content:
                if item.get('type') == 'listItem':
                    item_text = '\n'.join(render_block(child) for child in item.get('content', []))
                    items.append(f"- {item_text.strip()}")
            return '\n'.join(items)

        elif node_type == 'orderedList':
            # Render each list item with number prefix
            items = []
            for i, item in enumerate(content, 1):
                if item.get('type') == 'listItem':
                    item_text = '\n'.join(render_block(child) for child in item.get('content', []))
                    items.append(f"{i}. {item_text.strip()}")
            return '\n'.join(items)

        elif node_type == 'codeBlock':
            # Preserve code block content
            text = ''.join(render_inline(child) for child in content)
            return f"```\n{text}\n```"

        elif node_type == 'blockquote':
            # Render blockquote with > prefix
            lines = []
            for child in content:
                lines.append(f"> {render_block(child)}")
            return '\n'.join(lines)

        elif node_type == 'rule':
            return '---'

        elif node_type == 'doc':
            # Top-level document
            blocks = [render_block(child) for child in content]
            return '\n\n'.join(b for b in blocks if b)

        else:
            # Unknown block type - try to render content
            if content:
                return ''.join(render_inline(child) for child in content)
            return ''

    return render_block(adf)
