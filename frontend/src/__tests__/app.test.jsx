import React from 'react';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {App} from '../main.jsx';
import {CodeEditor} from '../components/CodeEditor.jsx';
import {Sidebar} from '../components/Sidebar.jsx';
import {apiClient} from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    listCollections: vi.fn(),
    getSyncStatus: vi.fn(),
    retrySync: vi.fn(),
    getRequest: vi.fn(),
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
    exportCollection: vi.fn(),
    exportRequestCurl: vi.fn(),
    reorderCollections: vi.fn(),
    reorderRequests: vi.fn(),
  },
}));

const testCollections = [
  {
    id: 'collection-1',
    updated_at: 'c1-v1',
    name: 'Smoke Tests',
    requests: [
      {
        id: 'request-1',
        updated_at: 'r1-v1',
        name: 'Health Check',
        method: 'GET',
        url: 'https://example.test/health',
        headers: [{enabled: true, key: 'Accept', value: 'application/json'}],
        body_content: '',
        body_raw_type: 'application/json',
      },
      {
        id: 'request-3',
        updated_at: 'r3-v1',
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
        updated_at: 'c2-v1',
        name: 'Nested',
        requests: [
          {
            id: 'request-2',
            updated_at: 'r2-v1',
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
    updated_at: 'c3-v1',
    name: 'Regression Tests',
    requests: [],
    children: [],
  },
];


function flattenTestRequests(collections) {
  return collections.flatMap((collection) => [
    ...(collection.requests || []),
    ...flattenTestRequests(collection.children || []),
  ]);
}

function renderApp(collections = testCollections) {
  apiClient.listCollections.mockResolvedValue(collections);
  apiClient.getSyncStatus.mockResolvedValue({status: 'synchronized', label: 'Synchronized', diagnostics: [], conflicts: [], retryable: false});
  apiClient.retrySync.mockResolvedValue({status: 'synchronizing', label: 'Synchronizing', diagnostics: ['Retry requested by client'], conflicts: [], retryable: false});
  apiClient.getRequest.mockImplementation((id) => Promise.resolve(flattenTestRequests(testCollections).find((request) => request.id === id)));
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
  apiClient.exportCollection.mockResolvedValue({info: {name: 'Smoke Tests'}, item: []});
  apiClient.exportRequestCurl.mockResolvedValue({curl: 'curl https://example.test/health'});
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
    vi.restoreAllMocks();
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


  test('opens only the initial active request as one tab', async () => {
    renderApp();

    await waitFor(() => expect(screen.getByRole('tab', {name: /health check/i})).toBeInTheDocument());

    const requestTabs = within(screen.getByRole('tablist', {name: /open requests/i})).getAllByRole('tab');
    expect(requestTabs).toHaveLength(1);
    expect(requestTabs[0]).toHaveAccessibleName('Health Check');
    expect(requestTabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  test('selecting a second request adds a second open tab', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('treeitem', {name: /get status check/i}));

    const requestTabs = within(screen.getByRole('tablist', {name: /open requests/i})).getAllByRole('tab');
    expect(requestTabs).toHaveLength(2);
    expect(requestTabs.map((tab) => tab.getAttribute('aria-label'))).toEqual(['Health Check', 'Status Check']);
    expect(screen.getByRole('tab', {name: /status check/i})).toHaveAttribute('aria-selected', 'true');
  });

  test('selecting an already-open request activates its tab without duplicating it', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('treeitem', {name: /get status check/i}));
    await user.click(screen.getByRole('treeitem', {name: /get health check/i}));
    await user.click(screen.getByRole('treeitem', {name: /get status check/i}));

    const requestTabs = within(screen.getByRole('tablist', {name: /open requests/i})).getAllByRole('tab');
    expect(requestTabs).toHaveLength(2);
    expect(screen.getAllByRole('tab', {name: /status check/i})).toHaveLength(1);
    expect(screen.getByRole('tab', {name: /status check/i})).toHaveAttribute('aria-selected', 'true');
  });


  test('closes an inactive request tab without selecting it or deleting it on the backend', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('treeitem', {name: /get status check/i}));
    expect(screen.getByRole('tab', {name: /status check/i})).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('button', {name: /close health check/i}));

    expect(screen.queryByRole('tab', {name: /^health check$/i})).not.toBeInTheDocument();
    expect(screen.getByRole('tab', {name: /status check/i})).toHaveAttribute('aria-selected', 'true');
    expect(apiClient.deleteRequest).not.toHaveBeenCalled();
  });

  test('closes the active request tab and activates the next adjacent tab', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('treeitem', {name: /get status check/i}));
    await user.click(screen.getByRole('tab', {name: /health check/i}));
    await user.click(screen.getByRole('button', {name: /close health check/i}));

    expect(screen.queryByRole('tab', {name: /^health check$/i})).not.toBeInTheDocument();
    expect(screen.getByRole('tab', {name: /status check/i})).toHaveAttribute('aria-selected', 'true');
    expect(apiClient.deleteRequest).not.toHaveBeenCalled();
  });

  test('closes the active request tab and falls back to the previous adjacent tab', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('treeitem', {name: /get status check/i}));
    await user.click(screen.getByRole('treeitem', {name: /post create widget/i}));
    await user.click(screen.getByRole('button', {name: /close create widget/i}));

    expect(screen.queryByRole('tab', {name: /^create widget$/i})).not.toBeInTheDocument();
    expect(screen.getByRole('tab', {name: /status check/i})).toHaveAttribute('aria-selected', 'true');
    expect(apiClient.deleteRequest).not.toHaveBeenCalled();
  });

  test('closes the focused active request tab from the keyboard', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('treeitem', {name: /get status check/i}));
    const statusTab = screen.getByRole('tab', {name: /status check/i});
    statusTab.focus();

    await user.keyboard('{Control>}w{/Control}');

    expect(screen.queryByRole('tab', {name: /^status check$/i})).not.toBeInTheDocument();
    expect(screen.getByRole('tab', {name: /health check/i})).toHaveAttribute('aria-selected', 'true');
    expect(apiClient.deleteRequest).not.toHaveBeenCalled();
  });


  test('clears the active request when closing the only open tab', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('button', {name: /close health check/i}));

    expect(screen.queryByRole('tablist', {name: /open requests/i})).not.toBeInTheDocument();
    expect(screen.getByText(/no requests available/i)).toBeInTheDocument();
    expect(apiClient.deleteRequest).not.toHaveBeenCalled();
  });


  test('opens a sidebar request by loading full details without sending it', async () => {
    const user = userEvent.setup();
    const partialCollections = [
      {
        ...testCollections[0],
        requests: [
          testCollections[0].requests[0],
          {...testCollections[0].requests[1], headers: [], body_content: '', body_raw_type: 'text/plain'},
        ],
      },
      testCollections[1],
    ];
    apiClient.getRequest.mockResolvedValueOnce({
      id: 'request-3',
      collection_id: 'collection-1',
      name: 'Status Check Full',
      method: 'PATCH',
      url: 'https://example.test/status/full',
      headers: [{enabled: true, key: 'X-Loaded', value: 'yes'}],
      body_content: '{"loaded":true}',
      body_raw_type: 'application/json',
    });
    renderApp(partialCollections);

    await user.click(await screen.findByRole('treeitem', {name: /status check/i}));

    await waitFor(() => expect(apiClient.getRequest).toHaveBeenCalledWith('request-3'));
    expect(screen.getByRole('tab', {name: /status check full/i})).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('textbox', {name: /request url/i})).toHaveValue('https://example.test/status/full');
    expect(apiClient.proxyRequest).not.toHaveBeenCalled();
  });

  test('activates an already-open request tab without duplicating or reloading details', async () => {
    const user = userEvent.setup();
    apiClient.getRequest.mockResolvedValueOnce({
      ...testCollections[0].requests[1],
      name: 'Status Check Loaded',
      url: 'https://example.test/status/loaded',
    });
    renderApp();

    await user.click(await screen.findByRole('treeitem', {name: /get status check/i}));
    await waitFor(() => expect(apiClient.getRequest).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('tab', {name: /health check/i}));
    await user.click(screen.getByRole('tab', {name: /status check loaded/i}));

    expect(screen.getAllByRole('tab', {name: /status check loaded/i})).toHaveLength(1);
    expect(apiClient.getRequest).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('tab', {name: /status check loaded/i})).toHaveAttribute('aria-selected', 'true');
  });

  test('loads all editable fields when opening a request', async () => {
    const user = userEvent.setup();
    apiClient.getRequest.mockResolvedValueOnce({
      id: 'request-2',
      name: 'Create Widget Details',
      method: 'PUT',
      url: 'https://example.test/widgets/42?expand=true',
      headers: [{enabled: true, key: 'Content-Type', value: 'application/json'}],
      body_content: '{"name":"loaded"}',
      body_raw_type: 'application/json',
    });
    renderApp();

    await user.click(await screen.findByRole('treeitem', {name: /post create widget/i}));

    await waitFor(() => expect(screen.getByRole('combobox', {name: /http method/i})).toHaveValue('PUT'));
    expect(screen.getByRole('textbox', {name: /request url/i})).toHaveValue('https://example.test/widgets/42?expand=true');
    expect(screen.getByRole('textbox', {name: /parameter row 1 key/i})).toHaveValue('expand');
    await user.click(screen.getByRole('tab', {name: 'Headers'}));
    expect(screen.getByRole('textbox', {name: /header row 1 key/i})).toHaveValue('Content-Type');
    await user.click(screen.getByRole('tab', {name: 'Body'}));
    expect(screen.getByRole('textbox', {name: /request json body editor/i})).toHaveTextContent('{"name":"loaded"}');
  });

  test('shows request-specific load failures without sending the request', async () => {
    const user = userEvent.setup();
    apiClient.getRequest.mockRejectedValueOnce(new Error('Unable to load request details'));
    renderApp();

    await user.click(await screen.findByRole('treeitem', {name: /get status check/i}));

    expect(await screen.findByText(/unable to load request details/i)).toBeInTheDocument();
    expect(apiClient.proxyRequest).not.toHaveBeenCalled();
    await user.click(screen.getByRole('tab', {name: /health check/i}));
    expect(screen.queryByText(/unable to load request details/i)).not.toBeInTheDocument();
  });

  test('resizes request and response panels with keyboard, drag, bounds, and persistence', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByText('Health Check')).toBeInTheDocument());

    const divider = screen.getByRole('separator', {name: /resize request and response panels/i});
    const main = divider.closest('.main');
    vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({top: 0, left: 0, width: 1000, height: 1000, right: 1000, bottom: 1000, x: 0, y: 0, toJSON: () => {}});

    expect(divider).toHaveAttribute('aria-orientation', 'horizontal');
    expect(divider).toHaveAttribute('aria-valuenow', '40');

    fireEvent.keyDown(divider, {key: 'ArrowDown'});
    expect(divider).toHaveAttribute('aria-valuenow', '45');
    expect(localStorage.getItem('pypostboy.responsePaneRatio')).toBe('45');
    expect(main).toHaveStyle({gridTemplateRows: '34px minmax(240px, 55fr) 5px minmax(220px, 45fr)'});

    fireEvent.pointerDown(divider, {clientY: 800});
    fireEvent.pointerMove(window, {clientY: 300});
    fireEvent.pointerUp(window);
    expect(divider).toHaveAttribute('aria-valuenow', '70');
    expect(localStorage.getItem('pypostboy.responsePaneRatio')).toBe('70');

    fireEvent.keyDown(divider, {key: 'ArrowDown'});
    fireEvent.keyDown(divider, {key: 'ArrowDown'});
    expect(divider).toHaveAttribute('aria-valuenow', '75');
  });

  test('switches response tabs by click and exposes accessible tab state', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', {name: /send/i}));
    await waitFor(() => expect(screen.getByText('200 OK')).toBeInTheDocument());

    const responseTabs = screen.getByRole('tablist', {name: /response tabs/i});
    const bodyTab = within(responseTabs).getByRole('tab', {name: 'Body'});
    const headersTab = within(responseTabs).getByRole('tab', {name: 'Headers'});
    const testsTab = within(responseTabs).getByRole('tab', {name: 'Tests'});

    expect(bodyTab).toHaveAttribute('aria-selected', 'true');
    expect(bodyTab).toHaveAttribute('tabIndex', '0');
    expect(headersTab).toHaveAttribute('aria-selected', 'false');
    expect(headersTab).toHaveAttribute('tabIndex', '-1');
    expect(screen.queryByRole('tab', {name: 'Cookies'})).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', {name: 'Timeline'})).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', {name: 'Console'})).not.toBeInTheDocument();

    await user.click(headersTab);

    expect(headersTab).toHaveAttribute('aria-selected', 'true');
    expect(headersTab).toHaveAttribute('tabIndex', '0');
    expect(bodyTab).toHaveAttribute('aria-selected', 'false');
    expect(document.getElementById('response-panel-body')).toHaveAttribute('hidden');
    expect(document.getElementById('response-panel-headers')).not.toHaveAttribute('hidden');
    expect(screen.getByText('content-type')).toBeInTheDocument();

    await user.click(testsTab);

    expect(testsTab).toHaveAttribute('aria-selected', 'true');
    expect(document.getElementById('response-panel-tests')).not.toHaveAttribute('hidden');
    expect(screen.getByText(/response tests are planned/i)).toBeInTheDocument();
  });

  test('switches response tabs with left and right arrow keys', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => expect(screen.getByText('Health Check')).toBeInTheDocument());
    const responseTabs = screen.getByRole('tablist', {name: /response tabs/i});
    const bodyTab = within(responseTabs).getByRole('tab', {name: 'Body'});
    const headersTab = within(responseTabs).getByRole('tab', {name: 'Headers'});
    const testsTab = within(responseTabs).getByRole('tab', {name: 'Tests'});

    bodyTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(headersTab).toHaveAttribute('aria-selected', 'true');
    expect(headersTab).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(testsTab).toHaveAttribute('aria-selected', 'true');
    expect(testsTab).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(headersTab).toHaveAttribute('aria-selected', 'true');
    expect(headersTab).toHaveFocus();
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

  test('exposes full long collection and request names to assistive technology and title tooltips', () => {
    const longCollectionName = 'Extremely Long Collection Name That Should Stay Visually Truncated But Remain Fully Available';
    const longRequestName = 'Extremely Long Request Name That Should Stay Visually Truncated But Remain Fully Available';

    render(
      <Sidebar
        collections={[{
          id: 'long-collection',
          name: longCollectionName,
          requests: [{
            id: 'long-request',
            name: longRequestName,
            method: 'PATCH',
            url: 'https://example.test/very/long/request',
            headers: [],
            body_content: '',
            body_raw_type: 'application/json',
          }],
          children: [],
        }]}
      />,
    );

    const tree = screen.getByRole('tree', {name: /collections/i});
    const collectionItem = within(tree).getByRole('treeitem', {name: longCollectionName});
    const requestItem = within(tree).getByRole('treeitem', {name: `PATCH ${longRequestName}`});

    expect(within(collectionItem).getByText(longCollectionName)).toHaveAttribute('title', longCollectionName);
    expect(within(requestItem).getByText(longRequestName)).toHaveAttribute('title', longRequestName);
    expect(requestItem).toHaveAttribute('aria-label', `PATCH ${longRequestName}`);
  });


  test('shows a non-actionable empty row for an expanded root collection', () => {
    render(<Sidebar collections={[{id: 'empty-root', name: 'Empty Root', requests: [], children: []}]} />);

    const tree = screen.getByRole('tree', {name: /collections/i});
    expect(within(tree).getByRole('treeitem', {name: /empty root/i})).toHaveAttribute('aria-expanded', 'true');
    expect(within(tree).getByText('No requests or folders')).toBeInTheDocument();
    expect(within(tree).queryByRole('treeitem', {name: /no requests or folders/i})).not.toBeInTheDocument();
    expect(within(tree).queryByRole('button', {name: /no requests or folders/i})).not.toBeInTheDocument();
  });

  test('shows a non-actionable empty row for an expanded nested folder', () => {
    render(
      <Sidebar
        collections={[{
          id: 'root',
          name: 'Root',
          requests: [],
          children: [{id: 'nested-empty', name: 'Nested Empty', requests: [], children: []}],
        }]}
      />,
    );

    const tree = screen.getByRole('tree', {name: /collections/i});
    expect(within(tree).getByRole('treeitem', {name: /nested empty/i})).toHaveAttribute('aria-expanded', 'true');
    expect(within(tree).getByText('No requests or folders')).toBeInTheDocument();
    expect(within(tree).queryByRole('treeitem', {name: /no requests or folders/i})).not.toBeInTheDocument();
    expect(within(tree).queryByRole('button', {name: /no requests or folders/i})).not.toBeInTheDocument();
  });

  test('closes collection action menus with Escape without calling mutation APIs', async () => {
    const user = userEvent.setup();
    const mutationCallbacks = {
      onCreateCollection: vi.fn(),
      onCreateRequest: vi.fn(),
      onRenameCollection: vi.fn(),
      onDuplicateCollection: vi.fn(),
      onDeleteCollection: vi.fn(),
      onExportCollection: vi.fn(),
    };

    render(<Sidebar collections={testCollections} {...mutationCallbacks} />);

    await user.click(screen.getByRole('button', {name: /actions for collection smoke tests/i}));
    expect(screen.getByRole('dialog', {name: /actions for smoke tests/i})).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', {name: /actions for smoke tests/i})).not.toBeInTheDocument();
    for (const callback of Object.values(mutationCallbacks)) {
      expect(callback).not.toHaveBeenCalled();
    }
  });

  test('closes request action menus with Escape without calling mutation APIs', async () => {
    const user = userEvent.setup();
    const mutationCallbacks = {
      onDuplicateRequest: vi.fn(),
      onDeleteRequest: vi.fn(),
      onMoveRequestToCollection: vi.fn(),
      onCopyRequestCurl: vi.fn(),
    };

    render(<Sidebar collections={testCollections} {...mutationCallbacks} />);

    await user.click(screen.getByRole('button', {name: /actions for request health check/i}));
    expect(screen.getByRole('dialog', {name: /actions for health check/i})).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', {name: /actions for health check/i})).not.toBeInTheDocument();
    for (const callback of Object.values(mutationCallbacks)) {
      expect(callback).not.toHaveBeenCalled();
    }
  });

  test('closes request confirmation dialogs with Escape without calling mutation APIs', async () => {
    const user = userEvent.setup();
    const mutationCallbacks = {
      onDuplicateRequest: vi.fn(),
      onDeleteRequest: vi.fn(),
      onMoveRequestToCollection: vi.fn(),
      onCopyRequestCurl: vi.fn(),
    };

    render(<Sidebar collections={testCollections} {...mutationCallbacks} />);

    await user.click(screen.getByRole('button', {name: /actions for request health check/i}));
    await user.click(screen.getByRole('button', {name: /delete request/i}));
    expect(screen.getByRole('dialog', {name: /delete health check/i})).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', {name: /delete health check/i})).not.toBeInTheDocument();
    for (const callback of Object.values(mutationCallbacks)) {
      expect(callback).not.toHaveBeenCalled();
    }
  });


  test('keeps a collapsed collection collapsed after collections refresh', async () => {
    const user = userEvent.setup();
    renderApp();

    const root = await screen.findByRole('treeitem', {name: /smoke tests/i});
    await waitFor(() => expect(root).toHaveAttribute('aria-expanded', 'true'));

    await user.click(root);
    expect(root).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('treeitem', {name: /health check/i})).not.toBeInTheDocument();

    apiClient.listCollections.mockResolvedValueOnce([
      ...testCollections,
      {id: 'collection-new', name: 'New Collection', requests: [], children: []},
    ]);
    await user.click(screen.getByRole('button', {name: /^create collection$/i}));
    await user.type(screen.getByRole('textbox', {name: /collection name/i}), 'New Collection');
    await user.click(screen.getByRole('button', {name: /save/i}));

    await waitFor(() => expect(apiClient.createCollection).toHaveBeenCalledWith({name: 'New Collection'}));
    expect(screen.getByRole('treeitem', {name: /smoke tests/i})).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('treeitem', {name: /health check/i})).not.toBeInTheDocument();
    expect(screen.getByRole('treeitem', {name: /new collection/i})).toBeInTheDocument();
  });

  test('restores persisted collection expansion state after remount', async () => {
    const user = userEvent.setup();
    const {unmount} = renderApp();

    const root = await screen.findByRole('treeitem', {name: /smoke tests/i});
    await waitFor(() => expect(root).toHaveAttribute('aria-expanded', 'true'));

    await user.click(root);
    expect(localStorage.getItem('pypostboy.collections.expandedIds')).toBe(JSON.stringify(['collection-collection-2']));
    unmount();

    renderApp();

    const remountedRoot = await screen.findByRole('treeitem', {name: /smoke tests/i});
    expect(remountedRoot).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('treeitem', {name: /health check/i})).not.toBeInTheDocument();
  });

  test('filters collections by request, folder, collection, and method matches', async () => {
    const user = userEvent.setup();
    renderApp();

    const filter = await screen.findByPlaceholderText(/filter collections/i);
    const tree = screen.getByRole('tree', {name: /collections/i});

    await user.type(filter, 'widget');
    expect(within(tree).getByRole('treeitem', {name: /smoke tests/i})).toBeInTheDocument();
    expect(within(tree).getByRole('treeitem', {name: /nested/i})).toBeInTheDocument();
    expect(within(tree).getByRole('treeitem', {name: /create widget/i})).toBeInTheDocument();
    expect(within(tree).queryByRole('treeitem', {name: /health check/i})).not.toBeInTheDocument();
    expect(within(tree).queryByRole('treeitem', {name: /regression tests/i})).not.toBeInTheDocument();
    expect(within(tree).getByText('Widget').tagName).toBe('MARK');

    await user.clear(filter);
    await user.type(filter, 'nested');
    expect(within(tree).getByRole('treeitem', {name: /smoke tests/i})).toBeInTheDocument();
    expect(within(tree).getByRole('treeitem', {name: /nested/i})).toBeInTheDocument();
    expect(within(tree).getByRole('treeitem', {name: /create widget/i})).toBeInTheDocument();

    await user.clear(filter);
    await user.type(filter, 'regression');
    expect(within(tree).getByRole('treeitem', {name: /regression tests/i})).toBeInTheDocument();
    expect(within(tree).queryByRole('treeitem', {name: /smoke tests/i})).not.toBeInTheDocument();

    await user.clear(filter);
    await user.type(filter, 'post');
    expect(within(tree).getByRole('treeitem', {name: /smoke tests/i})).toBeInTheDocument();
    expect(within(tree).getByRole('treeitem', {name: /nested/i})).toBeInTheDocument();
    expect(within(tree).getByRole('treeitem', {name: /create widget/i})).toBeInTheDocument();
    expect(within(tree).queryByRole('treeitem', {name: /health check/i})).not.toBeInTheDocument();
  });

  test('clears the collection filter and shows a no-results state when nothing matches', async () => {
    const user = userEvent.setup();
    renderApp();

    const filter = await screen.findByPlaceholderText(/filter collections/i);
    await user.type(filter, 'nothing matches this tree');

    expect(screen.getByText(/no matching collections or requests/i)).toBeInTheDocument();
    expect(screen.queryByRole('treeitem', {name: /smoke tests/i})).not.toBeInTheDocument();

    await user.clear(filter);
    expect(screen.queryByText(/no matching collections or requests/i)).not.toBeInTheDocument();
    expect(screen.getByRole('treeitem', {name: /smoke tests/i})).toBeInTheDocument();
    expect(screen.getByRole('treeitem', {name: /health check/i})).toBeInTheDocument();
    expect(screen.getByRole('treeitem', {name: /regression tests/i})).toBeInTheDocument();
  });

  test('reorders sibling collections optimistically', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => expect(screen.getByText('Regression Tests')).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', {name: /move collection up/i}).at(-1));

    await waitFor(() => expect(apiClient.reorderCollections).toHaveBeenCalledWith({
      parent_id: null,
      ordered_ids: ['collection-3', 'collection-1'],
      reorder_token: 'collection-1:c1-v1|collection-3:c3-v1',
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
      reorder_token: 'request-1:r1-v1|request-3:r3-v1',
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

  test('rolls back, refreshes, and reports request reorder conflicts', async () => {
    const user = userEvent.setup();
    const conflict = new Error('Request reorder token is stale; refresh collections and try again');
    conflict.status = 409;
    apiClient.listCollections
      .mockResolvedValueOnce(testCollections)
      .mockResolvedValueOnce(testCollections);
    apiClient.reorderRequests.mockRejectedValueOnce(conflict);
    render(<App />);

    await waitFor(() => expect(screen.getByText('Status Check')).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', {name: /move request up/i}).at(-1));

    await waitFor(() => expect(screen.getByText(/request reorder token is stale/i)).toBeInTheDocument());
    expect(apiClient.listCollections).toHaveBeenCalledTimes(2);
    const requestItems = screen.getAllByRole('treeitem').filter((item) => /Health Check|Status Check/.test(item.textContent));
    expect(requestItems[0]).toHaveTextContent('Health Check');
    expect(requestItems[1]).toHaveTextContent('Status Check');
  });

  test('rolls back, refreshes, and reports collection reorder conflicts', async () => {
    const user = userEvent.setup();
    const conflict = new Error('Collection reorder token is stale; refresh collections and try again');
    conflict.status = 409;
    apiClient.listCollections
      .mockResolvedValueOnce(testCollections)
      .mockResolvedValueOnce(testCollections);
    apiClient.reorderCollections.mockRejectedValueOnce(conflict);
    render(<App />);

    await waitFor(() => expect(screen.getByText('Regression Tests')).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', {name: /move collection up/i}).at(-1));

    await waitFor(() => expect(screen.getByText(/collection reorder token is stale/i)).toBeInTheDocument());
    expect(apiClient.listCollections).toHaveBeenCalledTimes(2);
    const treeItems = screen.getAllByRole('treeitem');
    expect(treeItems[0]).toHaveTextContent('Smoke Tests');
    expect(treeItems[1]).toHaveTextContent('Health Check');
    expect(treeItems.some((item) => item.textContent.includes('Regression Tests'))).toBe(true);
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
      reorder_token: 'request-1:r1-v1|request-3:r3-v1',
    }));
    expect(screen.getAllByRole('button', {name: /move request down/i}).length).toBeGreaterThan(0);
  });


  test('creates collections and local draft requests from sidebar actions before saving to the backend', async () => {
    const user = userEvent.setup();
    apiClient.listCollections
      .mockResolvedValueOnce(testCollections)
      .mockResolvedValueOnce([...testCollections, {id: 'collection-new', name: 'New Collection', requests: [], children: []}]);
    apiClient.createRequest.mockResolvedValue({id: 'request-new', name: 'New Request', method: 'GET', url: '', headers: [], body_content: '', body_raw_type: 'application/json', collection_id: 'collection-3'});

    render(<App />);
    await user.click(await screen.findByRole('button', {name: /^create collection$/i}));
    await user.type(screen.getByRole('textbox', {name: /collection name/i}), 'New Collection');
    await user.click(screen.getByRole('button', {name: /save/i}));
    await waitFor(() => expect(apiClient.createCollection).toHaveBeenCalledWith({name: 'New Collection'}));

    await user.click(screen.getByRole('button', {name: /^create request$/i}));
    await user.type(screen.getByRole('textbox', {name: /request name/i}), 'New Request');
    await user.selectOptions(screen.getByRole('combobox'), 'collection-3');
    await user.click(screen.getByRole('button', {name: /save/i}));

    expect(apiClient.createRequest).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', {name: /new request unsaved/i})).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('treeitem', {name: /get new request/i})).toHaveTextContent('●');

    await user.click(screen.getByRole('button', {name: /^save$/i}));
    await waitFor(() => expect(apiClient.createRequest).toHaveBeenCalledWith(expect.objectContaining({collection_id: 'collection-3', name: 'New Request', method: 'GET'})));
    await waitFor(() => expect(screen.getByRole('tab', {name: /^new request$/i})).toBeInTheDocument());
  });


  test('defaults blank sidebar draft requests to an untitled GET request and scopes them to the selected collection', async () => {
    const user = userEvent.setup();
    apiClient.createRequest.mockResolvedValue({id: 'request-blank', name: 'Untitled Request', method: 'GET', url: '', headers: [], body_content: '', body_raw_type: 'application/json', collection_id: 'collection-3'});

    renderApp();
    await user.click(await screen.findByRole('button', {name: /^create request$/i}));
    await user.selectOptions(screen.getByRole('combobox'), 'collection-3');
    await user.click(screen.getByRole('button', {name: /save/i}));

    expect(screen.getByRole('tab', {name: /untitled request unsaved/i})).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('combobox', {name: /http method/i})).toHaveValue('GET');
    expect(apiClient.createRequest).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', {name: /^save$/i}));
    await waitFor(() => expect(apiClient.createRequest).toHaveBeenCalledWith(expect.objectContaining({
      collection_id: 'collection-3',
      name: 'Untitled Request',
      method: 'GET',
    })));
  });

  test('preserves draft form data and shows an actionable error when backend creation fails', async () => {
    const user = userEvent.setup();
    apiClient.createRequest.mockRejectedValueOnce(new Error('Collection is no longer available'));

    renderApp();
    await user.click(await screen.findByRole('button', {name: /^create request$/i}));
    await user.type(screen.getByRole('textbox', {name: /request name/i}), 'Retry Me');
    await user.selectOptions(screen.getByRole('combobox'), 'collection-3');
    await user.click(screen.getByRole('button', {name: /save/i}));
    await user.type(screen.getByRole('textbox', {name: /request url/i}), 'https://example.test/retry');

    await user.click(screen.getByRole('button', {name: /^save$/i}));

    await waitFor(() => expect(screen.getByText(/could not save draft request/i)).toBeInTheDocument());
    expect(screen.getByText(/collection is no longer available/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: /retry me unsaved/i})).toBeInTheDocument();
    expect(screen.getByRole('textbox', {name: /request url/i})).toHaveValue('https://example.test/retry');
  });

  test('creates a nested folder from the collection action menu and keeps existing requests unchanged', async () => {
    const user = userEvent.setup();
    const initialRequests = testCollections[0].requests.map((request) => ({...request}));
    apiClient.listCollections
      .mockResolvedValueOnce(testCollections)
      .mockResolvedValueOnce([{...testCollections[0], requests: initialRequests, children: [...testCollections[0].children, {id: 'collection-folder', name: 'New Folder', parent_id: 'collection-1', requests: [], children: []}]}, testCollections[1]]);
    apiClient.createCollection.mockResolvedValueOnce({id: 'collection-folder', name: 'New Folder', parent_id: 'collection-1', requests: [], children: []});

    render(<App />);
    await user.click(await screen.findByRole('button', {name: /actions for collection smoke tests/i}));
    await user.click(screen.getByRole('button', {name: /create folder/i}));

    expect(screen.getByRole('dialog', {name: /create folder in smoke tests/i})).toBeInTheDocument();
    expect(screen.getByText(/destination: smoke tests/i)).toBeInTheDocument();
    expect(screen.getByText(/folder nesting: unlimited/i)).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', {name: /folder name/i}), 'New Folder');
    await user.click(screen.getByRole('button', {name: /save/i}));

    await waitFor(() => expect(apiClient.createCollection).toHaveBeenCalledWith({name: 'New Folder', parent_id: 'collection-1'}));
    expect(apiClient.createRequest).not.toHaveBeenCalled();
    expect(apiClient.updateRequest).not.toHaveBeenCalled();
    expect(testCollections[0].requests).toEqual(initialRequests);
  });

  test('rejects blank nested folder names before calling the API', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('button', {name: /actions for collection smoke tests/i}));
    await user.click(screen.getByRole('button', {name: /create folder/i}));
    await user.type(screen.getByRole('textbox', {name: /folder name/i}), '   ');
    await user.click(screen.getByRole('button', {name: /save/i}));

    expect(screen.getByRole('alert')).toHaveTextContent(/folder name is required/i);
    expect(apiClient.createCollection).not.toHaveBeenCalled();
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

  test('exports a collection JSON file from the collection action menu', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:collection-export');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderApp();

    await user.click(await screen.findByRole('button', {name: /actions for collection smoke tests/i}));
    await user.click(screen.getByRole('button', {name: /export collection/i}));
    await user.click(screen.getByRole('button', {name: /confirm/i}));

    await waitFor(() => expect(apiClient.exportCollection).toHaveBeenCalledWith('collection-1'));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:collection-export');
  });

  test('copies a request cURL command from the request action menu', async () => {
    const user = userEvent.setup();
    Object.assign(navigator, {clipboard: {writeText: vi.fn().mockResolvedValue()}});
    renderApp();

    await user.click(await screen.findByRole('button', {name: /actions for request health check/i}));
    await user.click(screen.getByRole('button', {name: /copy as curl/i}));
    await user.click(screen.getByRole('button', {name: /confirm/i}));

    await waitFor(() => expect(apiClient.exportRequestCurl).toHaveBeenCalledWith('request-1'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('curl https://example.test/health');
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


  test('renders query params from the request URL and updates the URL when params are edited', async () => {
    const user = userEvent.setup();
    apiClient.listCollections.mockResolvedValueOnce([
      {
        ...testCollections[0],
        requests: [
          {...testCollections[0].requests[0], url: 'https://example.test/health?status=ok&limit=10#top'},
          ...testCollections[0].requests.slice(1),
        ],
      },
      testCollections[1],
    ]);

    render(<App />);

    const statusValue = await screen.findByRole('textbox', {name: /parameter row 1 value/i});
    expect(screen.getByRole('textbox', {name: /parameter row 1 key/i})).toHaveValue('status');
    expect(statusValue).toHaveValue('ok');

    await user.clear(statusValue);
    await user.type(statusValue, 'healthy');

    expect(screen.getByRole('textbox', {name: /request url/i})).toHaveValue('https://example.test/health?status=healthy&limit=10#top');
  });

  test('renders active request headers and updates the header draft when headers are edited', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('tab', {name: 'Headers'}));

    expect(screen.getByRole('textbox', {name: /header row 1 key/i})).toHaveValue('Accept');
    const headerValue = screen.getByRole('textbox', {name: /header row 1 value/i});
    expect(headerValue).toHaveValue('application/json');

    await user.clear(headerValue);
    await user.type(headerValue, 'text/plain');

    await user.click(screen.getByRole('button', {name: /save/i}));
    await waitFor(() => expect(apiClient.updateRequest).toHaveBeenCalledWith('request-1', expect.objectContaining({
      headers: [{enabled: true, key: 'Accept', value: 'text/plain', description: ''}],
    })));
  });

  test('sends edited header drafts in the proxy payload', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('tab', {name: 'Headers'}));
    const headerValue = screen.getByRole('textbox', {name: /header row 1 value/i});
    await user.clear(headerValue);
    await user.type(headerValue, 'text/plain');

    await user.click(screen.getByRole('button', {name: /send/i}));

    await waitFor(() => expect(apiClient.proxyRequest).toHaveBeenCalledTimes(1));
    expect(apiClient.proxyRequest).toHaveBeenCalledWith(expect.objectContaining({
      headers: {Accept: 'text/plain'},
    }));
  });

  test('saves edited params and headers through the request update API', async () => {
    const user = userEvent.setup();
    apiClient.listCollections.mockResolvedValueOnce([
      {
        ...testCollections[0],
        requests: [
          {...testCollections[0].requests[0], url: 'https://example.test/health?status=ok'},
          ...testCollections[0].requests.slice(1),
        ],
      },
      testCollections[1],
    ]);

    render(<App />);

    const paramValue = await screen.findByRole('textbox', {name: /parameter row 1 value/i});
    await user.clear(paramValue);
    await user.type(paramValue, 'healthy');

    await user.click(screen.getByRole('tab', {name: 'Headers'}));
    const headerValue = screen.getByRole('textbox', {name: /header row 1 value/i});
    await user.clear(headerValue);
    await user.type(headerValue, 'text/plain');

    await user.click(screen.getByRole('button', {name: /save/i}));

    await waitFor(() => expect(apiClient.updateRequest).toHaveBeenCalledWith('request-1', expect.objectContaining({
      url: 'https://example.test/health?status=healthy',
      headers: [{enabled: true, key: 'Accept', value: 'text/plain', description: ''}],
    })));
  });

  test('sends edited JSON body draft in proxy payload', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('treeitem', {name: /post create widget/i}));
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

describe('Sidebar synchronization status', () => {
  test.each([
    ['synchronized', 'Synchronized'],
    ['synchronizing', 'Synchronizing'],
    ['offline', 'Offline'],
    ['failed', 'Sync failed'],
  ])('renders %s status label and diagnostics', (status, label) => {
    render(
      <Sidebar
        collections={[]}
        syncStatus={{status, label, diagnostics: ['diagnostic detail'], conflicts: [], retryable: false}}
      />,
    );

    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText('diagnostic detail')).toBeInTheDocument();
  });

  test('renders retry control for retryable failed status', async () => {
    const user = userEvent.setup();
    const onRetrySync = vi.fn();
    render(
      <Sidebar
        collections={[]}
        syncStatus={{status: 'failed', label: 'Sync failed', diagnostics: ['token expired'], conflicts: [], retryable: true}}
        onRetrySync={onRetrySync}
      />,
    );

    expect(screen.getByText('token expired')).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: /retry/i}));
    expect(onRetrySync).toHaveBeenCalledTimes(1);
  });

  test('renders conflict metadata without hiding diagnostics', () => {
    render(
      <Sidebar
        collections={[]}
        syncStatus={{
          status: 'failed',
          label: 'Sync failed',
          diagnostics: ['merge required'],
          conflicts: [{resource_type: 'request', resource_id: 42}],
          retryable: true,
        }}
      />,
    );

    expect(screen.getByText('merge required')).toBeInTheDocument();
    expect(screen.getByText('Conflict: request 42')).toBeInTheDocument();
  });
});
