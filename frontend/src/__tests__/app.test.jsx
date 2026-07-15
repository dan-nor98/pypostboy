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
    listRequestInstances: vi.fn(),
    createRequestInstance: vi.fn(),
    updateRequestInstance: vi.fn(),
    deleteRequestInstance: vi.fn(),
    importData: vi.fn(),
    createRequest: vi.fn(),
    createCollection: vi.fn(),
    updateCollection: vi.fn(),
    deleteCollection: vi.fn(),
    duplicateCollection: vi.fn(),
    deleteRequest: vi.fn(),
    duplicateRequest: vi.fn(),
    moveRequest: vi.fn(),
    reorderCollections: vi.fn(),
    reorderRequests: vi.fn(),
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
      {
        id: 'request-3',
        name: 'Status Check',
        method: 'GET',
        url: 'https://example.test/status',
        headers: [],
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
  {
    id: 'collection-3',
    name: 'Regression Tests',
    requests: [],
    children: [],
  },
];

function renderApp() {
  apiClient.listCollections.mockResolvedValue(testCollections);
  apiClient.updateRequest.mockImplementation((id, data) => Promise.resolve({...data, id}));
  apiClient.listRequestInstances.mockResolvedValue([
    {
      id: 'snapshot-1',
      name: 'Saved success',
      method: 'PATCH',
      url: 'https://example.test/snapshots/1',
      headers: [{enabled: true, key: 'X-Snapshot', value: 'yes'}],
      body_content: '{\"restored\":true}',
      body_raw_type: 'application/json',
      response_status: 201,
      response_status_text: 'Created',
      response_headers: {'content-type': 'application/json'},
      response_body: {created: true},
      response_time_ms: 35,
    },
  ]);
  apiClient.createRequestInstance.mockImplementation((requestId, data) => Promise.resolve({...data, id: 'snapshot-created', request_id: requestId}));
  apiClient.updateRequestInstance.mockImplementation((instanceId, data) => Promise.resolve({
    id: instanceId,
    name: data.name,
    method: 'PATCH',
    url: 'https://example.test/snapshots/1',
    headers: [],
    body_content: '',
  }));
  apiClient.deleteRequestInstance.mockResolvedValue({deleted: 1});
  apiClient.importData.mockReset();
  apiClient.createRequest.mockReset();
  apiClient.createCollection.mockResolvedValue({id: 'collection-new', name: 'New Collection', requests: [], children: []});
  apiClient.updateCollection.mockResolvedValue({id: 'collection-1', name: 'Renamed Collection'});
  apiClient.deleteCollection.mockResolvedValue({deleted: 1});
  apiClient.duplicateCollection.mockResolvedValue({id: 'collection-copy', name: 'Smoke Tests Copy'});
  apiClient.deleteRequest.mockResolvedValue({deleted: 1});
  apiClient.duplicateRequest.mockResolvedValue({id: 'request-copy', name: 'Health Check Copy'});
  apiClient.moveRequest.mockResolvedValue({id: 'request-1', collection_id: 'collection-3'});
  apiClient.reorderCollections.mockResolvedValue({});
  apiClient.reorderRequests.mockResolvedValue({});
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
    localStorage.clear();
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

  test('reorders sibling collections optimistically', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => expect(screen.getByText('Regression Tests')).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', {name: /move collection up/i}).at(-1));

    await waitFor(() => expect(apiClient.reorderCollections).toHaveBeenCalledWith({
      parent_id: null,
      ordered_ids: ['collection-3', 'collection-1'],
    }));
    const treeItems = screen.getAllByRole('treeitem');
    expect(treeItems[0]).toHaveTextContent('Regression Tests');
    expect(treeItems[1]).toHaveTextContent('Smoke Tests');
  });

  test('reorders requests inside a collection optimistically', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => expect(screen.getByText('Status Check')).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', {name: /move request up/i}).at(-1));

    await waitFor(() => expect(apiClient.reorderRequests).toHaveBeenCalledWith({
      collection_id: 'collection-1',
      ordered_ids: ['request-3', 'request-1'],
    }));
    const requestItems = screen.getAllByRole('treeitem').filter((item) => /Health Check|Status Check/.test(item.textContent));
    expect(requestItems[0]).toHaveTextContent('Status Check');
    expect(requestItems[1]).toHaveTextContent('Health Check');
  });

  test('rolls back optimistic request reorder on API error', async () => {
    const user = userEvent.setup();
    apiClient.reorderRequests.mockRejectedValueOnce(new Error('Could not reorder requests'));
    renderApp();

    await waitFor(() => expect(screen.getByText('Status Check')).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', {name: /move request up/i}).at(-1));

    await waitFor(() => expect(screen.getByText(/could not reorder requests/i)).toBeInTheDocument());
    const requestItems = screen.getAllByRole('treeitem').filter((item) => /Health Check|Status Check/.test(item.textContent));
    expect(requestItems[0]).toHaveTextContent('Health Check');
    expect(requestItems[1]).toHaveTextContent('Status Check');
  });

  test('supports keyboard operation for reorder controls', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => expect(screen.getByText('Status Check')).toBeInTheDocument());
    const moveStatusUp = screen.getAllByRole('button', {name: /move request up/i}).at(-1);
    moveStatusUp.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(apiClient.reorderRequests).toHaveBeenCalledWith({
      collection_id: 'collection-1',
      ordered_ids: ['request-3', 'request-1'],
    }));
    expect(screen.getAllByRole('button', {name: /move request down/i}).length).toBeGreaterThan(0);
  });


  test('creates collections and requests from sidebar actions', async () => {
    const user = userEvent.setup();
    apiClient.listCollections
      .mockResolvedValueOnce(testCollections)
      .mockResolvedValueOnce([...testCollections, {id: 'collection-new', name: 'New Collection', requests: [], children: []}])
      .mockResolvedValueOnce([...testCollections, {...testCollections[1], requests: [{id: 'request-new', name: 'New Request', method: 'GET', url: '', headers: [], body_content: '', body_raw_type: 'application/json'}]}]);
    apiClient.createRequest.mockResolvedValue({id: 'request-new', name: 'New Request'});

    render(<App />);
    await user.click(await screen.findByRole('button', {name: /^create collection$/i}));
    await user.type(screen.getByRole('textbox', {name: /collection name/i}), 'New Collection');
    await user.click(screen.getByRole('button', {name: /save/i}));
    await waitFor(() => expect(apiClient.createCollection).toHaveBeenCalledWith({name: 'New Collection'}));

    await user.click(screen.getByRole('button', {name: /^create request$/i}));
    await user.type(screen.getByRole('textbox', {name: /request name/i}), 'New Request');
    await user.selectOptions(screen.getByRole('combobox'), 'collection-3');
    await user.click(screen.getByRole('button', {name: /save/i}));
    await waitFor(() => expect(apiClient.createRequest).toHaveBeenCalledWith(expect.objectContaining({collection_id: 'collection-3', name: 'New Request'})));
  });

  test('renames, duplicates, and deletes a collection from its action menu', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('button', {name: /actions for collection smoke tests/i}));
    await user.click(screen.getByRole('button', {name: /rename collection/i}));
    const nameInput = screen.getByRole('textbox', {name: /collection name/i});
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed Collection');
    await user.click(screen.getByRole('button', {name: /save/i}));
    await waitFor(() => expect(apiClient.updateCollection).toHaveBeenCalledWith('collection-1', {name: 'Renamed Collection'}));

    await user.click(screen.getByRole('button', {name: /actions for collection smoke tests/i}));
    await user.click(screen.getByRole('button', {name: /duplicate collection/i}));
    expect(screen.getByRole('dialog', {name: /duplicate smoke tests/i})).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: /confirm/i}));
    await waitFor(() => expect(apiClient.duplicateCollection).toHaveBeenCalledWith('collection-1'));

    await user.click(screen.getByRole('button', {name: /actions for collection smoke tests/i}));
    await user.click(screen.getByRole('button', {name: /delete collection/i}));
    expect(screen.getByRole('alert')).toHaveTextContent(/confirm to continue/i);
    await user.click(screen.getByRole('button', {name: /confirm/i}));
    await waitFor(() => expect(apiClient.deleteCollection).toHaveBeenCalledWith('collection-1'));
  });

  test('duplicates, deletes, and moves a request from its action menu', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('button', {name: /actions for request health check/i}));
    await user.click(screen.getByRole('button', {name: /duplicate request/i}));
    await user.click(screen.getByRole('button', {name: /confirm/i}));
    await waitFor(() => expect(apiClient.duplicateRequest).toHaveBeenCalledWith('request-1'));

    await user.click(screen.getByRole('button', {name: /actions for request health check/i}));
    await user.click(screen.getByRole('button', {name: /move request/i}));
    await user.selectOptions(screen.getByRole('combobox', {name: /destination collection/i}), 'collection-3');
    await user.click(screen.getByRole('button', {name: /save/i}));
    await waitFor(() => expect(apiClient.moveRequest).toHaveBeenCalledWith('request-1', 'collection-3'));

    await user.click(screen.getByRole('button', {name: /actions for request health check/i}));
    await user.click(screen.getByRole('button', {name: /delete request/i}));
    await user.click(screen.getByRole('button', {name: /confirm/i}));
    await waitFor(() => expect(apiClient.deleteRequest).toHaveBeenCalledWith('request-1'));
  });

  test('shows an inline error when a sidebar action fails', async () => {
    const user = userEvent.setup();
    apiClient.createCollection.mockRejectedValueOnce(new Error('Unable to create collection'));
    renderApp();

    await user.click(await screen.findByRole('button', {name: /^create collection$/i}));
    await user.type(screen.getByRole('textbox', {name: /collection name/i}), 'Broken');
    await user.click(screen.getByRole('button', {name: /save/i}));

    expect(await screen.findByText(/unable to create collection/i)).toBeInTheDocument();
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





  test('resolves environment variables before sending a request', async () => {
    const user = userEvent.setup();
    renderApp();

    const urlInput = await screen.findByRole('textbox', {name: /request url/i});
    await user.clear(urlInput);
    await user.type(urlInput, '{{baseUrl}}/health');
    expect(screen.getByText(/environment variables detected for local/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: /send/i}));

    await waitFor(() => expect(apiClient.proxyRequest).toHaveBeenCalledTimes(1));
    expect(apiClient.proxyRequest).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://example.test/health',
    }));
  });

  test('blocks send and warns for unresolved environment variables', async () => {
    const user = userEvent.setup();
    renderApp();

    const urlInput = await screen.findByRole('textbox', {name: /request url/i});
    await user.clear(urlInput);
    await user.type(urlInput, '{{missing}}/health');
    await user.click(screen.getByRole('button', {name: /send/i}));

    expect(await screen.findByText(/unresolved variables: missing/i)).toBeInTheDocument();
    expect(apiClient.proxyRequest).not.toHaveBeenCalled();
  });

  test('opens the environment panel and masks secret values', async () => {
    localStorage.setItem('pypostboy.environments', JSON.stringify([{id: 'local', name: 'Local', variables: [{key: 'token', value: 'super-secret-token', secret: true}]}]));
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', {name: /environments/i}));

    expect(screen.getByRole('complementary', {name: /environment panel/i})).toBeInTheDocument();
    expect(screen.getByRole('textbox', {name: /variable 1 value/i})).toHaveValue('su••••••••en');
    expect(screen.queryByDisplayValue('super-secret-token')).not.toBeInTheDocument();
  });

  test('loads snapshots for the active request and restores a saved snapshot into the editable draft', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => expect(apiClient.listRequestInstances).toHaveBeenCalledWith('request-1'));
    expect(screen.getByRole('region', {name: /snapshots/i})).toBeInTheDocument();
    expect(screen.getByText('Saved success')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: /restore snapshot/i}));

    expect(screen.getByRole('combobox', {name: /http method/i})).toHaveValue('PATCH');
    expect(screen.getByRole('textbox', {name: /request url/i})).toHaveValue('https://example.test/snapshots/1');
    expect(screen.getByRole('tab', {name: 'Body'})).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('textbox', {name: /request json body editor/i})).toHaveTextContent('{"restored":true}');
  });

  test('saves snapshots with current request and response state using optimistic UI', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => expect(screen.getByText('Saved success')).toBeInTheDocument());
    await user.click(screen.getByRole('button', {name: /send/i}));
    await waitFor(() => expect(screen.getByText('200 OK')).toBeInTheDocument());

    await user.click(screen.getByRole('button', {name: /save snapshot/i}));

    expect(screen.getByText('Health Check snapshot')).toBeInTheDocument();
    await waitFor(() => expect(apiClient.createRequestInstance).toHaveBeenCalledTimes(1));
    expect(apiClient.createRequestInstance).toHaveBeenCalledWith('request-1', expect.objectContaining({
      method: 'GET',
      url: 'https://example.test/health',
      headers: [{enabled: true, key: 'Accept', value: 'application/json'}],
      body_content: '',
      response_status: 200,
      response_status_text: 'OK',
      response_headers: {'content-type': 'application/json'},
      response_body: {ok: true},
      response_time_ms: 42,
    }));
  });

  test('renames and deletes snapshots optimistically', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => expect(screen.getByText('Saved success')).toBeInTheDocument());
    await user.click(screen.getByRole('button', {name: /rename/i}));
    const nameInput = screen.getByRole('textbox', {name: /snapshot name/i});
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed snapshot');
    await user.click(screen.getByRole('button', {name: /^save$/i}));

    expect(screen.getByText('Renamed snapshot')).toBeInTheDocument();
    await waitFor(() => expect(apiClient.updateRequestInstance).toHaveBeenCalledWith('snapshot-1', {name: 'Renamed snapshot'}));

    await user.click(screen.getByRole('button', {name: /delete/i}));
    expect(screen.queryByText('Renamed snapshot')).not.toBeInTheDocument();
    await waitFor(() => expect(apiClient.deleteRequestInstance).toHaveBeenCalledWith('snapshot-1'));
  });

  test('imports a parsed cURL command, creates a request, refreshes collections, and selects it', async () => {
    const user = userEvent.setup();
    const importedRequest = {
      id: 'request-3',
      name: 'POST /widgets',
      method: 'POST',
      url: 'https://example.test/widgets',
      headers: [{enabled: true, key: 'Content-Type', value: 'application/json'}],
      body_type: 'json',
      body_content: '{"name":"demo"}',
      form_data: [],
      body_raw_type: 'application/json',
    };
    apiClient.listCollections
      .mockResolvedValueOnce(testCollections)
      .mockResolvedValueOnce([{...testCollections[0], requests: [...testCollections[0].requests, importedRequest]}]);
    apiClient.importData.mockResolvedValue({
      method: 'POST',
      url: 'https://example.test/widgets',
      headers: {'Content-Type': 'application/json'},
      body_type: 'json',
      body_content: '{"name":"demo"}',
      form_data: [],
    });
    apiClient.createRequest.mockResolvedValue(importedRequest);

    render(<App />);
    await user.click(await screen.findByRole('button', {name: /import curl/i}));
    await user.click(screen.getByRole('textbox', {name: /paste curl command/i}));
    await user.paste(`curl -X POST https://example.test/widgets -H 'Content-Type: application/json' -d '{"name":"demo"}'`);
    await user.click(screen.getByRole('button', {name: /parse curl/i}));

    expect(await screen.findByRole('region', {name: /parsed curl request/i})).toBeInTheDocument();
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('https://example.test/widgets')).toBeInTheDocument();
    expect(screen.getByText('json')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: /create request/i}));

    await waitFor(() => expect(apiClient.createRequest).toHaveBeenCalledWith(expect.objectContaining({
      collection_id: 'collection-1',
      method: 'POST',
      url: 'https://example.test/widgets',
      body_type: 'json',
      body_content: '{"name":"demo"}',
    })));
    await waitFor(() => expect(apiClient.listCollections).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('tab', {name: /post \/widgets/i})).toHaveAttribute('aria-selected', 'true');
  });

  test('shows structured parser warnings from cURL import', async () => {
    const user = userEvent.setup();
    renderApp();
    apiClient.importData.mockResolvedValue({
      method: 'GET',
      url: 'https://example.test',
      headers: {},
      body_type: 'none',
      body_content: '',
      form_data: [],
      warnings: [{code: 'unsupported_option', message: 'Skipped --compressed'}],
    });

    await user.click(await screen.findByRole('button', {name: /import curl/i}));
    await user.type(screen.getByRole('textbox', {name: /paste curl command/i}), 'curl --compressed https://example.test');
    await user.click(screen.getByRole('button', {name: /parse curl/i}));

    expect(await screen.findByText(/unsupported_option: skipped --compressed/i)).toBeInTheDocument();
    expect(screen.getByRole('region', {name: /parsed curl request/i})).toBeInTheDocument();
  });

  test('shows structured parser errors from failed cURL import', async () => {
    const user = userEvent.setup();
    renderApp();
    const parseError = new Error('Invalid cURL command');
    parseError.errors = [{code: 'missing_url', message: 'No URL found'}];
    parseError.warnings = [{code: 'ignored_token', message: 'Ignored token'}];
    apiClient.importData.mockRejectedValue(parseError);

    await user.click(await screen.findByRole('button', {name: /import curl/i}));
    await user.type(screen.getByRole('textbox', {name: /paste curl command/i}), 'curl -X POST');
    await user.click(screen.getByRole('button', {name: /parse curl/i}));

    expect(await screen.findByText(/missing_url: no url found/i)).toBeInTheDocument();
    expect(screen.getByText(/ignored_token: ignored token/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /create request/i})).not.toBeInTheDocument();
  });

  test('imports an uploaded Postman collection JSON file, refreshes collections, and selects the first imported request', async () => {
    const user = userEvent.setup();
    const importedRequest = {
      id: 'postman-request-1',
      name: 'List Widgets',
      method: 'GET',
      url: 'https://api.example.test/widgets',
      headers: [],
      body_content: '',
      body_raw_type: 'application/json',
    };
    const importedCollection = {id: 'postman-collection-1', name: 'Postman Import', requests: [importedRequest], children: []};
    apiClient.listCollections
      .mockResolvedValueOnce(testCollections)
      .mockResolvedValueOnce([...testCollections, importedCollection]);
    apiClient.importData.mockResolvedValue(importedCollection);

    render(<App />);
    const postmanJson = JSON.stringify({
      info: {name: 'Postman Import'},
      item: [{name: 'List Widgets', request: {method: 'GET', url: 'https://api.example.test/widgets'}}],
    });
    const file = new File([postmanJson], 'postman.json', {type: 'application/json'});

    await user.click(await screen.findByRole('button', {name: /import postman/i}));
    await user.upload(screen.getByLabelText(/upload postman json file/i), file);
    expect(await screen.findByText(/selected postman\.json/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: /^import postman$/i}));

    await waitFor(() => expect(apiClient.importData).toHaveBeenCalledWith('postman', {
      info: {name: 'Postman Import'},
      item: [{name: 'List Widgets', request: {method: 'GET', url: 'https://api.example.test/widgets'}}],
    }));
    await waitFor(() => expect(apiClient.listCollections).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('tab', {name: /list widgets/i})).toHaveAttribute('aria-selected', 'true');
  });

  test('shows an accessible alert and skips the API call for invalid Postman JSON', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('button', {name: /import postman/i}));
    await user.type(screen.getByRole('textbox', {name: /paste postman json/i}), '{"info":');
    await user.click(screen.getByRole('button', {name: /^import postman$/i}));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid_json: enter valid postman collection json/i);
    expect(apiClient.importData).not.toHaveBeenCalled();
  });

  test('surfaces backend validation failures from Postman import in an accessible alert', async () => {
    const user = userEvent.setup();
    renderApp();
    const importError = new Error('No data provided');
    importError.errors = [{code: 'invalid_postman', message: 'Postman collection must include items'}];
    apiClient.importData.mockRejectedValue(importError);

    await user.click(await screen.findByRole('button', {name: /import postman/i}));
    await user.type(screen.getByRole('textbox', {name: /paste postman json/i}), JSON.stringify({info: {name: 'Broken'}}));
    await user.click(screen.getByRole('button', {name: /^import postman$/i}));

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid_postman: postman collection must include items/i);
    expect(apiClient.listCollections).toHaveBeenCalledTimes(1);
  });

  test('toggles the document theme from the header icon', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));

    const themeButton = screen.getByRole('button', {name: /switch to light theme/i});
    expect(themeButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(themeButton);

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('light'));
    expect(screen.getByRole('button', {name: /switch to dark theme/i})).toHaveAttribute('aria-pressed', 'true');
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
