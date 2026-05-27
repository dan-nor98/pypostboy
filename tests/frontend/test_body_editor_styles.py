from pathlib import Path


def test_body_textarea_is_not_forced_hidden_by_css_rule():
    css = Path('public/css/components/forms.css').read_text()

    assert '#bodyContent { display: none; }' not in css
