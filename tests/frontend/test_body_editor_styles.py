from pathlib import Path


def test_body_textarea_is_not_forced_hidden_by_css_rule():
    css = Path('frontend/src/styles/index.css').read_text(encoding='utf-8')

    assert '#bodyContent { display: none; }' not in css
