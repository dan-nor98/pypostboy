import subprocess
import textwrap


def run_node(script: str) -> None:
    subprocess.run(
        ["node", "--input-type=module", "-e", textwrap.dedent(script)],
        check=True,
        cwd=".",
    )


def test_render_response_body_populates_matching_line_numbers_without_copy_text():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { renderResponseBody } from './public/js/ui/response-viewer.js';

        function stripHtml(html) {
            return String(html)
                .replace(/<[^>]+>/g, '')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&');
        }

        class FakeElement {
            constructor(selector) {
                this.selector = selector;
                this.parentElement = null;
                this.children = [];
                this._innerHTML = '';
                this._textContent = '';
            }

            appendChild(child) {
                child.parentElement = this;
                this.children.push(child);
            }

            querySelector(selector) {
                return this.children.find((child) => child.selector === selector) || null;
            }

            set innerHTML(value) {
                this._innerHTML = String(value);
                this.textContent = stripHtml(value);
            }

            set textContent(value) {
                this._textContent = String(value);
            }

            get textContent() {
                if (this.children.length > 0) {
                    return this.children.map((child) => child.textContent).join('');
                }
                return this._textContent;
            }

            get innerHTML() {
                return this._innerHTML;
            }
        }

        const viewer = new FakeElement('.response-code-viewer');
        const lineNumbers = new FakeElement('.response-line-numbers');
        const responseBody = new FakeElement('#responseBody');
        const responseBodyCode = new FakeElement('code');
        responseBody.appendChild(responseBodyCode);
        viewer.appendChild(lineNumbers);
        viewer.appendChild(responseBody);

        renderResponseBody(responseBody, { ok: true, items: [1, 2] }, { 'content-type': 'application/json' });

        assert.equal(lineNumbers.textContent, '1\n2\n3\n4\n5\n6\n7');
        assert.match(responseBodyCode.innerHTML, /json-key/);
        assert.equal(responseBody.textContent, responseBodyCode.textContent, 'copy source pre must expose only code text');
        assert.doesNotMatch(responseBodyCode.textContent, /^1\n2\n3/m, 'copy source code text must not include line numbers');
        """
    )
