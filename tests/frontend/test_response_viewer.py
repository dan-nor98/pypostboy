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


def test_json_tree_collapsed_child_preserves_original_gutter_line_numbers():
    run_node(
        r"""
        import assert from 'node:assert/strict';
        import { renderResponseBody, toggleJsonTreeNode } from './public/js/ui/response-viewer.js';

        function stripHtml(html) {
            return String(html)
                .replace(/<[^>]+>/g, '')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&');
        }

        function createClassList(initial = []) {
            const classes = new Set(initial);
            return {
                add(name) { classes.add(name); },
                remove(name) { classes.delete(name); },
                contains(name) { return classes.has(name); },
                toggle(name, force) {
                    const enabled = force === undefined ? !classes.has(name) : Boolean(force);
                    if (enabled) classes.add(name);
                    else classes.delete(name);
                    return enabled;
                },
            };
        }

        class FakeElement {
            constructor(selector, classes = []) {
                this.selector = selector;
                this.parentElement = null;
                this.children = [];
                this._innerHTML = '';
                this._textContent = '';
                this.dataset = {};
                this.classList = createClassList(classes);
            }

            appendChild(child) {
                child.parentElement = this;
                this.children.push(child);
            }

            querySelector(selector) {
                return this.children.find((child) => child.selector === selector) || null;
            }

            querySelectorAll(selector) {
                if (selector !== '.json-tree-line') return [];
                const matches = [];
                const visit = (node) => {
                    if (node.classList && node.classList.contains('json-tree-line')) matches.push(node);
                    for (const child of node.children) visit(child);
                };
                visit(this);
                return matches;
            }

            contains(target) {
                if (target === this) return true;
                return this.children.some((child) => child.contains(target));
            }

            closest(selector) {
                let node = this;
                const className = selector.startsWith('.') ? selector.slice(1) : selector;
                while (node) {
                    if (node.classList && node.classList.contains(className)) return node;
                    node = node.parentElement;
                }
                return null;
            }

            setAttribute(name, value) {
                this[name] = String(value);
            }

            set innerHTML(value) {
                this._innerHTML = String(value);
                this.textContent = stripHtml(value);
            }

            get innerHTML() { return this._innerHTML; }

            set textContent(value) { this._textContent = String(value); }

            get textContent() {
                if (this.children.length > 0) return this.children.map((child) => child.textContent).join('');
                return this._textContent;
            }
        }

        const viewer = new FakeElement('.response-code-viewer');
        const lineNumbers = new FakeElement('.response-line-numbers');
        const responseBody = new FakeElement('#responseBody');
        const responseBodyCode = new FakeElement('code');
        responseBody.appendChild(responseBodyCode);
        viewer.appendChild(lineNumbers);
        viewer.appendChild(responseBody);

        renderResponseBody(responseBody, { child: { hidden: true }, sibling: 1 }, { 'content-type': 'application/json' });

        const rootNode = new FakeElement('rootNode', ['json-tree-node']);
        const rootLine = new FakeElement('rootLine', ['json-tree-line']);
        const rootChildren = new FakeElement('rootChildren', ['json-tree-children']);
        const childNode = new FakeElement('childNode', ['json-tree-node']);
        const childLine = new FakeElement('childLine', ['json-tree-line']);
        const childToggle = new FakeElement('button', ['json-tree-toggle']);
        const childChildren = new FakeElement('childChildren', ['json-tree-children']);
        const hiddenLine = new FakeElement('hiddenLine', ['json-tree-line']);
        const hiddenClose = new FakeElement('hiddenClose', ['json-tree-line']);
        const siblingLine = new FakeElement('siblingLine', ['json-tree-line']);
        const rootClose = new FakeElement('rootClose', ['json-tree-line']);

        responseBodyCode.children = [];
        responseBodyCode.appendChild(rootNode);
        rootNode.appendChild(rootLine);
        rootNode.appendChild(rootChildren);
        rootChildren.appendChild(childNode);
        childNode.appendChild(childLine);
        childLine.appendChild(childToggle);
        childNode.appendChild(childChildren);
        childChildren.appendChild(hiddenLine);
        childChildren.appendChild(hiddenClose);
        rootChildren.appendChild(siblingLine);
        rootChildren.appendChild(rootClose);

        toggleJsonTreeNode(responseBody, childToggle);

        assert.equal(lineNumbers.textContent, '1\n2\n5\n6');
        """
    )
