import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {App} from '../main.jsx';
import {CodeEditor} from '../components/CodeEditor.jsx';
import {apiClient} from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    listCollections: vi.fn(),
    proxyRequest: vi.fn(),
    updateRequest: vi.fn(),
  },
}));

const testCollections = [
  {
    id: 'collection-1',
    name: 'Smoke Tests',
    requests: [
      {
        id: 'request-1',
        name: 'Health Check',
        method: 'GET',
        url: 'https://example.test/health',
        headers: [{enabled: true, key: 'Accept', value: 'application/json'}],
        body_content: '',
        body_raw_type: 'application/json',
      },
    ],
    children: [
      {
        id: 'collection-2',
        name: 'Nested',
        requests: [
          {
            id: 'request-2',
            name: 'Create Widget',
            method: 'POST',
            url: 'https://example.test/widgets',
            headers: [],
            body_content: '{\"name\":\"demo\"}',
            body_raw_type: 'application/json',
          },
        ],
        children: [],
      },
    ],
  },
];

function renderApp() {
  apiClient.listCollections.mockResolvedValue(testCollections);
  apiClient.updateRequest.mockImplementation((id, data) => Promise.resolve({...data, id}));
  apiClient.proxyRequest.mockResolvedValue({
    status: 200,
    statusText: 'OK',
    time: 42,
    headers: {'content-type': 'application/json'},
    body: {ok: true},
  });

  return render(<App />);
}


describe('CodeEditor', () => {
  test('preserves focus and content when word wrap is toggled externally', async () => {
    const user = userEvent.setup();
    const {rerender} = render(
      <CodeEditor value={'{\"name\":\"demo\"}'} onChange={vi.fn()} wordWrap={true} label="Request JSON body editor" />,
    );

    const editor = screen.getByRole('textbox', {name: /request json body editor/i});
    await user.click(editor);

    expect(editor).toHaveFocus();
    expect(editor).toHaveTextContent('{"name":"demo"}');

    rerender(
      <CodeEditor value={'{\"name\":\"demo\"}'} onChange={vi.fn()} wordWrap={false} label="Request JSON body editor" />,
    );

    expect(screen.getByRole('textbox', {name: /request json body editor/i})).toHaveFocus();
    expect(screen.getByRole('textbox', {name: /request json body editor/i})).toHaveTextContent('{"name":"demo"}');
  });
});

describe('App shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  test('renders the header, activity bar, request toolbar, Send button, command palette, and response summary', async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.getByRole('banner')).toHaveClass('header');
    expect(screen.getByText('PostBoy')).toBeInTheDocument();
    expect(screen.getByRole('navigation', {name: /activity bar/i})).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Health Check')).toBeInTheDocument());

    const sendButton = screen.getByRole('button', {name: /send/i});
    expect(sendButton.closest('.request-toolbar')).toBeInTheDocument();
    expect(sendButton).toBeEnabled();

    expect(screen.getByText(/send a request to view the response/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: /command palette/i}));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/type a command or search/i)).toBeInTheDocument();
  });



  test('exposes request and response tabs with tablist, tab, tabpanel, selection, and control relationships', async () => {
    renderApp();

    await waitFor(() => expect(screen.getByRole('tab', {name: /health check/i})).toBeInTheDocument());

    const requestTab = screen.getByRole('tab', {name: /health check/i});
    expect(screen.getByRole('tablist', {name: /open requests/i})).toContainElement(requestTab);
    expect(requestTab).toHaveAttribute('aria-selected', 'true');
    expect(requestTab).toHaveAttribute('aria-controls', 'request-panel-request-1');
    expect(screen.getByRole('tabpanel', {name: /health check/i})).toHaveAttribute('id', 'request-panel-request-1');

    const paramsTab = screen.getByRole('tab', {name: 'Params'});
    expect(screen.getByRole('tablist', {name: /request configuration tabs/i})).toContainElement(paramsTab);
    expect(paramsTab).toHaveAttribute('aria-selected', 'true');
    expect(paramsTab).toHaveAttribute('tabIndex', '0');
    expect(paramsTab).toHaveAttribute('aria-controls', 'request-config-panel-params');

    const responseBodyTab = within(screen.getByRole('tablist', {name: /response tabs/i})).getByRole('tab', {name: 'Body'});
    expect(screen.getByRole('tablist', {name: /response tabs/i})).toContainElement(responseBodyTab);
    expect(responseBodyTab).toHaveAttribute('aria-selected', 'true');
    expect(responseBodyTab).toHaveAttribute('aria-controls', 'response-panel-body');
    expect(screen.getByRole('tabpanel', {name: 'Body'})).toHaveAttribute('id', 'response-panel-body');
  });

  test('supports keyboard-only collections tree navigation', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => expect(screen.getByRole('tree', {name: /collections/i})).toBeInTheDocument());
    const root = screen.getByRole('treeitem', {name: /smoke tests/i});
    root.focus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('treeitem', {name: /health check/i})).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('treeitem', {name: /nested/i})).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('treeitem', {name: /smoke tests/i})).toHaveFocus();

    await user.keyboard('{Space}');
    expect(root).toHaveAttribute('aria-expanded', 'false');

    await user.keyboard('{Enter}');
    expect(root).toHaveAttribute('aria-expanded', 'true');
  });

  test('traps command palette focus, closes on Escape, and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    renderApp();

    const trigger = screen.getByRole('button', {name: /command palette/i});
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', {name: /command palette/i});
    const search = screen.getByPlaceholderText(/type a command or search/i);
    await waitFor(() => expect(search).toHaveFocus());

    await user.tab({shift: true});
    expect(dialog).toContainElement(document.activeElement);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', {name: /command palette/i})).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });


  test('saves edited request method and URL and reconciles the toolbar state', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => expect(screen.getByText('Health Check')).toBeInTheDocument());

    await user.selectOptions(screen.getByRole('combobox', {name: /http method/i}), 'PUT');
    const urlInput = screen.getByRole('textbox', {name: /request url/i});
    await user.clear(urlInput);
    await user.type(urlInput, 'https://example.test/health/updated');

    await user.click(screen.getByRole('button', {name: /save/i}));

    await waitFor(() => expect(apiClient.updateRequest).toHaveBeenCalledTimes(1));
    expect(apiClient.updateRequest).toHaveBeenCalledWith('request-1', expect.objectContaining({
      method: 'PUT',
      url: 'https://example.test/health/updated',
    }));
    await waitFor(() => expect(screen.getByRole('combobox', {name: /http method/i})).toHaveValue('PUT'));
    expect(screen.getByRole('textbox', {name: /request url/i})).toHaveValue('https://example.test/health/updated');
    expect(screen.getByText('PUT https://example.test/health/updated')).toBeInTheDocument();
  });

  test('switches request configuration tabs by click and updates tab/panel state', async () => {
    const user = userEvent.setup();
    renderApp();

    const paramsTab = await screen.findByRole('tab', {name: 'Params'});
    const bodyTab = within(screen.getByRole('tablist', {name: /request configuration tabs/i})).getByRole('tab', {name: 'Body'});

    expect(paramsTab).toHaveAttribute('aria-selected', 'true');
    expect(document.getElementById('request-config-panel-params')).not.toHaveAttribute('hidden');
    expect(screen.queryByRole('textbox', {name: /request json body editor/i})).not.toBeInTheDocument();

    await user.click(bodyTab);

    expect(bodyTab).toHaveAttribute('aria-selected', 'true');
    expect(bodyTab).toHaveAttribute('tabIndex', '0');
    expect(paramsTab).toHaveAttribute('aria-selected', 'false');
    expect(paramsTab).toHaveAttribute('tabIndex', '-1');
    expect(document.getElementById('request-config-panel-body')).not.toHaveAttribute('hidden');
    expect(screen.getByRole('textbox', {name: /request json body editor/i})).toBeInTheDocument();
  });

  test('switches request configuration tabs with left and right arrow keys', async () => {
    const user = userEvent.setup();
    renderApp();

    const paramsTab = await screen.findByRole('tab', {name: 'Params'});
    paramsTab.focus();

    await user.keyboard('{ArrowRight}');
    const authorizationTab = screen.getByRole('tab', {name: 'Authorization'});
    expect(authorizationTab).toHaveAttribute('aria-selected', 'true');
    expect(authorizationTab).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(paramsTab).toHaveAttribute('aria-selected', 'true');
    expect(paramsTab).toHaveFocus();
  });

  test('sends edited JSON body draft in proxy payload', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('tab', {name: /create widget/i}));
    await user.click(within(screen.getByRole('tablist', {name: /request configuration tabs/i})).getByRole('tab', {name: 'Body'}));

    const editor = screen.getByRole('textbox', {name: /request json body editor/i});
    await user.click(editor);
    await user.keyboard('{Control>}a{/Control}');
    await user.paste('{"name":"edited"}');

    await user.click(screen.getByRole('button', {name: /send/i}));

    await waitFor(() => expect(apiClient.proxyRequest).toHaveBeenCalledTimes(1));
    expect(apiClient.proxyRequest).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      url: 'https://example.test/widgets',
      body: '{"name":"edited"}',
      contentType: 'application/json',
    }));
  });

  test('supports keyboard shortcuts for sending and toggling the command palette', async () => {
    renderApp();

    await waitFor(() => expect(apiClient.listCollections).toHaveBeenCalled());

    fireEvent.keyDown(window, {key: 'Enter', ctrlKey: true});

    await waitFor(() => expect(apiClient.proxyRequest).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('200 OK')).toBeInTheDocument());
    expect(screen.getByText('42 ms')).toBeInTheDocument();
    expect(screen.getByText('1 headers')).toBeInTheDocument();

    fireEvent.keyDown(window, {key: 'P', ctrlKey: true, shiftKey: true});
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, {key: 'p', metaKey: true, shiftKey: true});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
